// Migration one-shot : les images stockées en data-URI base64 (logo_url, photo_url, realisations[].image)
// sont téléversées dans le bucket `artisan-media/<uid>/…` et remplacées par leur URL publique.
// Idempotent : ne touche que les valeurs commençant par `data:`. Service_role (bypass RLS storage).
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })

const extOf = (mime) => (mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('svg') ? 'svg' : 'jpg')
async function upload(uid, dataUri, tag) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUri)
  if (!m) return dataUri // pas une data-URI → inchangé
  const mime = m[1], buf = Buffer.from(m[2], 'base64')
  const path = `${uid}/${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(mime)}`
  const r = await fetch(`${SB}/storage/v1/object/artisan-media/${path}`, {
    method: 'POST', headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': mime, 'x-upsert': 'true', 'cache-control': '31536000' }, body: buf,
  })
  if (!r.ok) throw new Error(`upload ${tag} ${r.status} ${(await r.text()).slice(0, 120)}`)
  return `${SB}/storage/v1/object/public/artisan-media/${path}`
}

const dry = process.argv.includes('--dry')
const rows = await (await rest('artisans?select=id,logo_url,photo_url,realisations')).json()
let touched = 0, imgs = 0
for (const a of rows) {
  const patch = {}
  if (typeof a.logo_url === 'string' && a.logo_url.startsWith('data:')) { patch.logo_url = dry ? '(data→bucket)' : await upload(a.id, a.logo_url, 'logo'); imgs++ }
  if (typeof a.photo_url === 'string' && a.photo_url.startsWith('data:')) { patch.photo_url = dry ? '(data→bucket)' : await upload(a.id, a.photo_url, 'photo'); imgs++ }
  if (Array.isArray(a.realisations)) {
    let changed = false
    const real = []
    for (const r of a.realisations) {
      if (r && typeof r.image === 'string' && r.image.startsWith('data:')) { real.push({ ...r, image: dry ? '(data→bucket)' : await upload(a.id, r.image, 'real') }); changed = true; imgs++ }
      else real.push(r)
    }
    if (changed) patch.realisations = real
  }
  if (Object.keys(patch).length) {
    touched++
    if (!dry) { const rr = await rest(`artisans?id=eq.${a.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }); if (!rr.ok) console.log('  ! PATCH', a.id, rr.status) }
    console.log(`${dry ? '[dry] ' : ''}artisan ${a.id} : ${Object.keys(patch).join(', ')}`)
  }
}
console.log(`\n${dry ? '[DRY] ' : ''}${touched} artisans, ${imgs} images ${dry ? 'à migrer' : 'migrées'}.`)
