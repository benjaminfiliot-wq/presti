// Contrôle qualité des photos à l'import (v4 §7/E3).
//
// La vraie limite de qualité d'un site d'artisan n'est pas le code, c'est la photo :
// prise au téléphone, souvent floue, souvent sombre. Le réflexe habituel — accepter
// et dégrader en silence — donne un site terne dont personne ne comprend pourquoi.
// Ici on MESURE et on DIT, avant publication, en langage d'artisan.
//
// Tout est calculé dans le navigateur, sur une miniature : aucune photo n'est envoyée
// nulle part pour être analysée.

export type Role = 'hero' | 'galerie' | 'detail' | 'portrait'
export type Gravite = 'bloquant' | 'avertissement'
export type Alerte = { gravite: Gravite; message: string }

export type Analyse = {
  largeur: number
  hauteur: number
  role: Role
  nettete: number     // variance du laplacien : ~0 = très flou, > 200 = net
  luminosite: number  // 0 → 255
  contraste: number   // écart-type des luminances
  alertes: Alerte[]
}

/** Taille d'analyse : assez grande pour juger la netteté, assez petite pour être instantanée. */
const ANALYSE_PX = 480

function dessiner(img: HTMLImageElement, max: number): ImageData | null {
  const e = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * e))
  const h = Math.max(1, Math.round(img.height * e))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, w, h)
  try { return ctx.getImageData(0, 0, w, h) } catch { return null }
}

/**
 * Netteté par variance du laplacien : on mesure à quel point les contrastes locaux
 * sont marqués. Une photo bougée a des transitions molles → variance basse.
 */
function mesurer(d: ImageData): { nettete: number; luminosite: number; contraste: number } {
  const { width: w, height: h, data } = d
  const gris = new Float32Array(w * h)
  let somme = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gris[p] = g; somme += g
  }
  const moy = somme / gris.length
  let variance = 0
  for (let p = 0; p < gris.length; p++) { const e = gris[p] - moy; variance += e * e }
  const contraste = Math.sqrt(variance / gris.length)

  // Laplacien 4-voisins, bords exclus.
  let sl = 0, sl2 = 0, n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x
      const l = gris[p - 1] + gris[p + 1] + gris[p - w] + gris[p + w] - 4 * gris[p]
      sl += l; sl2 += l * l; n++
    }
  }
  const ml = n ? sl / n : 0
  return { nettete: n ? sl2 / n - ml * ml : 0, luminosite: moy, contraste }
}

function roleDe(w: number, h: number): Role {
  const r = w / h
  if (r < 0.85) return 'portrait'
  if (w >= 2000 && r >= 1.4) return 'hero'
  if (w < 900) return 'detail'
  return 'galerie'
}

/**
 * Analyse une photo choisie par l'artisan. Ne modifie rien, ne bloque rien de force :
 * elle rend des constats, à l'appelant de décider quoi en dire.
 */
export function analyserImage(file: File): Promise<Analyse | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const d = dessiner(img, ANALYSE_PX)
      const { width, height } = img
      URL.revokeObjectURL(url)
      if (!d) { resolve(null); return }
      const m = mesurer(d)
      const alertes: Alerte[] = []

      // Résolution — le seul cas où on refuse : en dessous, c'est inexploitable partout.
      if (Math.max(width, height) < 700) {
        alertes.push({ gravite: 'bloquant', message: `Cette photo est trop petite (${width}×${height} px) : elle sera floue dès qu'on l'agrandit. Renvoyez-la depuis votre téléphone sans la compresser.` })
      } else if (Math.max(width, height) < 1400) {
        alertes.push({ gravite: 'avertissement', message: `Photo de petite taille (${width}×${height} px) : très bien en vignette, mais évitez-la en photo principale.` })
      }

      // Netteté. Les seuils viennent de l'observation de photos de chantier au téléphone :
      // sous ~55 le flou de bougé se voit à l'œil nu en grand format.
      if (m.nettete < 55) {
        alertes.push({ gravite: 'avertissement', message: 'Cette photo semble floue ou bougée. Elle passera en vignette, mais pas en grand format — refaites-la en calant le téléphone.' })
      }

      // Exposition.
      if (m.luminosite < 58) {
        alertes.push({ gravite: 'avertissement', message: 'Photo très sombre. Refaites-la de jour ou en allumant l’éclairage : c’est ce qui change le plus le rendu du site.' })
      } else if (m.luminosite > 212) {
        alertes.push({ gravite: 'avertissement', message: 'Photo surexposée : les blancs sont brûlés et les détails perdus. Évitez le contre-jour.' })
      }
      if (m.contraste < 26) {
        alertes.push({ gravite: 'avertissement', message: 'Image très plate (peu de contraste) — souvent un contre-jour ou une vitre. Le sujet ne ressortira pas.' })
      }

      resolve({ largeur: width, hauteur: height, role: roleDe(width, height), ...m, alertes })
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

/** Les six conseils de prise de vue (§E3) — courts, actionnables, sans jargon photo. */
export const CONSEILS_PHOTO: { titre: string; detail: string }[] = [
  { titre: 'De jour, près d’une fenêtre', detail: 'La lumière naturelle fait plus pour vos photos que n’importe quel réglage.' },
  { titre: 'Le téléphone bien calé', detail: 'Appuyez les coudes ou posez-le : c’est le bougé qui rend les photos floues.' },
  { titre: 'Un plan large, un détail', detail: 'Le large montre le chantier, le détail montre votre travail. Prenez les deux.' },
  { titre: 'Avant et après, même angle', detail: 'La comparaison est ce qui convainc le plus — pensez à photographier avant de commencer.' },
  { titre: 'Rangez le fond', detail: 'Outils, cartons, bâches : dix secondes de rangement valent une retouche.' },
  { titre: 'Évitez le contre-jour', detail: 'Fenêtre dans le dos, pas en face, sinon le sujet devient une silhouette noire.' },
]
