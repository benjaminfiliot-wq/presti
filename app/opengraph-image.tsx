import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const alt = "Presti — le premier qui répond décroche le chantier"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Aperçu de partage (Open Graph / Twitter) : la carte de marque « l'aube » est un PNG figé
// (public/marque/presti-partage-1200x630.png), rendu depuis la trace peinte — on ne la
// recompose pas à la volée, la marque n'est pas un dessin de code.
export default async function Image() {
  const png = await readFile(path.join(process.cwd(), 'public', 'marque', 'presti-partage-1200x630.png'))
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400, immutable' } })
}
