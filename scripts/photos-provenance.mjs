// scripts/photos-provenance.mjs — les photos d'un site de démo sont-elles bien celles que les attributions disent ?
// Un agent a déjà écrit, le 14/09, un générateur qui téléchargeait des photos Picsum et leur collait un auteur et une
// licence Wikimedia Commons inventés (public/sites-demo/build.mjs). Une attribution plausible ne prouve rien : ici on
// interroge l'API de Commons pour chaque fichier cité, on compare l'auteur, on télécharge la vignette et on la compare
// à l'image locale (empreinte perceptuelle 8×8 en niveaux de gris). Distance de Hamming ≤ 12 sur 64 bits = même photo.
//
// Usage : node scripts/photos-provenance.mjs plombier [electricien …]   (sans argument : les neuf métiers)
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const DEMOS = path.join(RACINE, 'public', 'sites-demo')
const METIERS = process.argv.slice(2).length ? process.argv.slice(2) : ['plombier', 'electricien', 'chauffagiste', 'macon', 'menuisier', 'peintre', 'carreleur', 'couvreur', 'serrurier']
const UA = 'PrestiDemoProvenance/1.0 (https://prestiapp.fr; contact@prestiapp.fr)'

async function empreinte(buf) {
  const px = await sharp(buf).greyscale().resize(8, 8, { fit: 'fill' }).raw().toBuffer()
  const moy = px.reduce((s, v) => s + v, 0) / px.length
  let bits = ''
  for (const v of px) bits += v > moy ? '1' : '0'
  return bits
}
const hamming = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d }

async function commons(titre) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  u.search = new URLSearchParams({ action: 'query', titles: titre, prop: 'imageinfo', iiprop: 'user|url|extmetadata', iiurlwidth: '480', format: 'json' })
  const r = await fetch(u, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`API ${r.status}`)
  const j = await r.json()
  const p = Object.values(j.query?.pages || {})[0]
  if (!p || p.missing !== undefined || !p.imageinfo) return null
  const ii = p.imageinfo[0]
  const meta = ii.extmetadata || {}
  return { user: ii.user, vignette: ii.thumburl, licence: meta.LicenseShortName?.value, artiste: (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim() }
}

let total = 0, faux = 0
for (const m of METIERS) {
  const dossier = path.join(DEMOS, m)
  const attr = JSON.parse(fs.readFileSync(path.join(dossier, 'attributions.json'), 'utf8'))
  const liste = Array.isArray(attr) ? attr : (attr.images || attr.photos || Object.values(attr).flat())
  // Une entrée par photo (les variantes -480/-960/-1600 .avif/.webp partagent la source)
  const parSource = new Map()
  for (const a of liste) { const src = a.source || a.url || a.page || ''; if (!parSource.has(src)) parSource.set(src, a) }
  for (const [src, a] of parSource) {
    total++
    // Une photo venue par Openverse (Flickr…) : pas d'API Commons, mais l'image d'origine est connue — on la compare.
    if (a.origine?.via === 'openverse' && a.origine.image) {
      const base = String(a.fichier).replace(/-(480|720|960|1600)\.(avif|webp|jpg|png)$/i, '')
      const local = ['-1600.webp', '-960.webp', '-720.webp', '-480.webp'].map((s) => path.join(dossier, base + s)).find(fs.existsSync)
      try {
        const rv = await fetch(a.origine.image, { headers: { 'User-Agent': UA } })
        const dist = hamming(await empreinte(Buffer.from(await rv.arrayBuffer())), await empreinte(fs.readFileSync(local)))
        if (dist <= 12 && a.auteur && a.auteur.length >= 3) console.log(`✓ ${m} ${path.basename(local)} = ${a.origine.fournisseur || 'openverse'} ${src.slice(0, 60)} (${a.licence}, distance ${dist})`)
        else { faux++; console.log(`✗ ${m} ${a.fichier} : photo différente de l'image d'origine (distance ${dist}) ou auteur absent`) }
      } catch (e) { console.log(`? ${m} ${a.fichier} : origine injoignable (${e.message})`) }
      await new Promise((r) => setTimeout(r, 250))
      continue
    }
    const mt = /File:(.+)$/.exec(decodeURIComponent(src))
    if (!mt) { faux++; console.log(`✗ ${m} ${a.fichier} : source sans page de fichier (${src})`); continue }
    let info
    try { info = await commons('File:' + mt[1]) } catch (e) { console.log(`? ${m} ${a.fichier} : ${e.message}`); continue }
    if (!info) { faux++; console.log(`✗ ${m} ${a.fichier} : ${mt[1]} n'existe pas sur Commons`); continue }
    // l'image locale la plus grande en webp
    const base = String(a.fichier).replace(/-(480|960|1600)\.(avif|webp|jpg|png)$/i, '')
    const cands = ['-1600.webp', '-960.webp', '-480.webp', '.webp', '.jpg'].map((s) => path.join(dossier, base + s)).filter(fs.existsSync)
    if (!cands.length) { faux++; console.log(`✗ ${m} ${a.fichier} : fichier local introuvable`); continue }
    let dist = null
    try {
      const rv = await fetch(info.vignette, { headers: { 'User-Agent': UA } })
      const distante = await empreinte(Buffer.from(await rv.arrayBuffer()))
      const locale = await empreinte(fs.readFileSync(cands[0]))
      dist = hamming(distante, locale)
    } catch (e) { console.log(`? ${m} ${a.fichier} : vignette ${e.message}`) }
    const auteurOk = a.auteur && (info.artiste.toLowerCase().includes(String(a.auteur).toLowerCase().slice(0, 12)) || info.user.toLowerCase() === String(a.auteur).toLowerCase())
    const memePhoto = dist !== null && dist <= 12
    if (!memePhoto || !auteurOk) {
      faux++
      console.log(`✗ ${m} ${a.fichier} : ${memePhoto ? 'même photo' : `photo différente (distance ${dist})`}, auteur déclaré « ${a.auteur} » / Commons « ${info.artiste || info.user} », licence Commons ${info.licence}`)
    } else console.log(`✓ ${m} ${path.basename(cands[0])} = ${mt[1].slice(0, 50)} (${info.licence}, distance ${dist})`)
    await new Promise((r) => setTimeout(r, 250))
  }
}
console.log(`\n${total} photos, ${faux} fausse(s) attribution(s)`)
process.exit(faux ? 1 : 0)
