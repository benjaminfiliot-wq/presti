// scripts/refs-images-cles.mjs — regarder VRAIMENT une référence MotionSites : son aperçu est un WebP animé public ; on en
// tire quatre images-clés (début, tiers, deux tiers, fin) par référence dans .orchestre/preuves/refs/<id>-t0..t3.png,
// et une planche de contact (planche-refs.jpg) qu'un humain ou Claude Code regarde en une image. C'est la preuve
// « sous les yeux » du prompt v16 §2.2 : des images du site qui joue, pas des captures du catalogue.
//
// Usage : node scripts/refs-images-cles.mjs <fichier json {id: url}>     (défaut : .orchestre/preuves/refs/apercus.json)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.join(RACINE, '.orchestre', 'preuves', 'refs')
const F = process.argv[2] || path.join(DOSSIER, 'apercus.json')
const apercus = JSON.parse(fs.readFileSync(F, 'utf8'))
fs.mkdirSync(DOSSIER, { recursive: true })
const UA = 'PrestiRefs/1.0 (https://prestiapp.fr)'
const cases = [], LARGEUR = 320, HAUTEUR = 200
let ligne = 0
for (const [id, url] of Object.entries(apercus)) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    let pages = 1, duree = 0, meta = {}, choix = [0], extraire
    if (/\.mp4(\?|$)/i.test(url)) {
      // une vidéo : ffmpeg (déjà là pour la chaîne vidéo) — quatre instants répartis sur la durée
      const tmp = path.join(DOSSIER, `${id}.mp4`); fs.writeFileSync(tmp, buf)
      const sonde = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', tmp], { encoding: 'utf8' })
      const j = JSON.parse(sonde.stdout || '{}'); duree = Number(j.format?.duration || 0); meta = { width: j.streams?.[0]?.width, height: j.streams?.[0]?.height }
      pages = Math.max(1, Math.round(duree * 25)); choix = [0, duree / 3, (2 * duree) / 3, Math.max(0, duree - 0.2)]
      extraire = async (t, png) => { spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(t), '-i', tmp, '-frames:v', '1', png], { encoding: 'utf8' }) }
    } else {
      meta = await sharp(buf, { animated: true }).metadata()
      pages = meta.pages || 1
      duree = (meta.delay || []).reduce((s, d) => s + (d || 0), 0) / 1000
      choix = pages > 1 ? [0, Math.floor(pages / 3), Math.floor((2 * pages) / 3), pages - 1] : [0]
      extraire = async (p, png) => { await sharp(buf, { page: p }).png().toFile(png) }
    }
    const sorties = []
    for (let k = 0; k < choix.length; k++) {
      const png = path.join(DOSSIER, `${id}-t${k}.png`)
      await extraire(choix[k], png)
      if (!fs.existsSync(png)) throw new Error('image non extraite')
      sorties.push(png)
      const vignette = await sharp(png).resize(LARGEUR, HAUTEUR, { fit: 'cover', position: 'top' }).toBuffer()
      const etiquette = Buffer.from(`<svg width="${LARGEUR}" height="${HAUTEUR}"><rect x="0" y="0" width="${LARGEUR}" height="22" fill="#000" opacity="0.65"/><text x="6" y="16" font-size="12" font-family="sans-serif" fill="#fff">${id} · image ${choix[k] + 1}/${pages}${k === 0 ? ` · ${duree.toFixed(1)} s · ${meta.width}×${meta.pageHeight || meta.height}` : ''}</text></svg>`)
      cases.push({ input: await sharp(vignette).composite([{ input: etiquette, top: 0, left: 0 }]).toBuffer(), left: k * (LARGEUR + 6), top: ligne * (HAUTEUR + 6) })
    }
    console.log(`✓ ${id.padEnd(26)} ${pages} image(s), ${duree.toFixed(1)} s, ${meta.width}×${meta.pageHeight || meta.height} → ${sorties.length} PNG`)
    ligne++
  } catch (e) { console.log(`✗ ${id} : ${e.message}`) }
}
if (cases.length) {
  const sortie = path.join(DOSSIER, 'planche-refs.jpg')
  await sharp({ create: { width: 4 * (LARGEUR + 6) - 6, height: ligne * (HAUTEUR + 6) - 6, channels: 3, background: '#111' } }).composite(cases).jpeg({ quality: 82 }).toFile(sortie)
  console.log(`planche : ${sortie}`)
}
