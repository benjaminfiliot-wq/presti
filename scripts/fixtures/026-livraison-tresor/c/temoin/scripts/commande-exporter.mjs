// TÉMOIN du lot C (fiche 026-029, Claude Code) — une implémentation de référence de scripts/commande-exporter.mjs (fiche
// 026-033), écrite pour prouver que scripts/commande-exporter-qa.mjs sait être VERT sur un exporteur réel. Elle n'est
// jamais livrée : l'outil .orchestre/preuves/026-029/outils/sait-echouer.mjs la pose dans une maquette du dépôt, sous
// .orchestre/travail/, puis la casse critère par critère. Codex écrit la sienne (026-033) sans la lire.
//
//   node --import ./scripts/ts-loader.mjs scripts/commande-exporter.mjs <commande_id> --sortie=<dossier>
//        [--depuis=<fichier.json>] [--hote-photos=<url>]
// Codes : 0 exporté, 2 usage, 3 dossier incomplet, 1 autre erreur.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exiger = createRequire(path.join(RACINE, 'package.json'))
const args = process.argv.slice(2)
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const [commandeId] = args.filter((a) => !a.startsWith('--'))
const usage = (m) => { console.error(`usage : commande-exporter.mjs <commande_id> --sortie=<dossier> [--depuis=<fichier.json>] [--hote-photos=<url>] — ${m}`); process.exit(2) }
if (!commandeId || !/^[0-9a-f-]{36}$/i.test(commandeId)) usage('identifiant de commande absent ou invalide')
if (!opt('sortie')) usage('--sortie manque')
const SORTIE = path.resolve(opt('sortie'))
const dans = (parent, p) => { const r = path.relative(parent, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)) }
if (dans(path.join(RACINE, 'public'), SORTIE)) usage('la sortie est sous public/ : refusé')
if (dans(RACINE, SORTIE) && !dans(path.join(RACINE, '.orchestre', 'travail'), SORTIE)) usage('dans le dépôt, la sortie va sous .orchestre/travail/ seulement')

// .env.local, sans rien afficher et sans écraser ce qui est posé (comme scripts/site-deposer.mjs:17).
const envLocal = path.join(RACINE, '.env.local')
for (const l of fs.existsSync(envLocal) ? fs.readFileSync(envLocal, 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }

const { erreursFabrication } = await import(pathToFileURL(path.join(RACINE, 'lib', 'siteCommande.ts')).href)
const sharp = exiger('sharp')

// 1. La commande et l'artisan.
let commande, artisan, stockage = null
if (opt('depuis')) {
  const j = JSON.parse(fs.readFileSync(path.resolve(opt('depuis')), 'utf8'))
  commande = j.commande; artisan = j.artisan
} else {
  const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL, CLE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL_SB || !CLE) { console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants'); process.exit(1) }
  const { createClient } = exiger('@supabase/supabase-js')
  const admin = createClient(URL_SB, CLE, { auth: { persistSession: false } })
  const c = await admin.from('sites_commandes').select('*').eq('id', commandeId).maybeSingle()
  if (c.error || !c.data) { console.error(`✗ commande ${commandeId} introuvable`); process.exit(1) }
  commande = c.data
  const a = await admin.from('artisans').select('*').eq('id', commande.artisan_id).maybeSingle()
  if (a.error || !a.data) { console.error('✗ artisan de la commande introuvable'); process.exit(3) }
  artisan = a.data
  stockage = admin.storage.from('artisan-media')
}
if (commande?.id !== commandeId) { console.error('✗ la commande lue ne porte pas cet identifiant'); process.exit(1) }
if (!['payee', 'generee'].includes(commande.etat)) { console.error(`✗ commande en état « ${commande.etat} » : payee ou generee attendu`); process.exit(1) }
const erreurs = erreursFabrication(commande)
if (erreurs.length) { console.error(`✗ dossier incomplet (${erreurs.length}) :\n${erreurs.map((e) => `  - ${e}`).join('\n')}`); process.exit(3) }
const telephone = artisan?.tel_public || artisan?.tel || null
if (!telephone && !commande.email) { console.error('✗ dossier incomplet : ni téléphone ni adresse de contact'); process.exit(3) }

// 2. Les photos : le bucket public artisan-media du projet, sous <artisan_id>/, rien d'autre n'est demandé.
const projet = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin } catch { return null } })()
const prefixe = projet ? `${projet}/storage/v1/object/public/artisan-media/${commande.artisan_id}/` : null
const refusees = []
const nomDe = (u) => { try { return decodeURIComponent(new URL(String(u)).pathname.split('/').pop() || '?') } catch { return String(u).slice(-40) } }
const acceptees = []
const m = commande.matiere ?? {}
;(m.photos ?? []).forEach((p, i) => {
  const u = String(p?.url ?? '')
  const nom = prefixe && u.startsWith(prefixe) ? decodeURIComponent(u.slice(prefixe.length)) : null
  if (!nom || nom.includes('/') || nom.includes('\\') || nom.includes('..') || !/^[\w .-]+$/.test(nom)) { refusees.push(`${nomDe(u)} : hors du dossier de l'artisan dans artisan-media`); return }
  acceptees.push({ i, p, cle: `${commande.artisan_id}/${nom}`, nom })
})
if (m.logo_url && !(prefixe && String(m.logo_url).startsWith(prefixe))) refusees.push('logo : hors du dossier de l\'artisan dans artisan-media')

const lire = async (cle) => {
  if (opt('hote-photos')) {
    const r = await fetch(`${opt('hote-photos').replace(/\/+$/, '')}/${cle.split('/').map(encodeURIComponent).join('/')}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return Buffer.from(await r.arrayBuffer())
  }
  if (!stockage) throw new Error('aucun stockage')
  const { data, error } = await stockage.download(cle)
  if (error) throw new Error(error.message)
  return Buffer.from(await data.arrayBuffer())
}
const LARGEURS = [480, 960, 1600]
const fichiers = [] // { rel, buf }
const attributions = []
const photosExport = []
const bases = new Set()
for (const a of acceptees) {
  let buf
  try { buf = await lire(a.cle) } catch (e) { refusees.push(`${a.nom} : illisible dans le stockage`); continue }
  let meta
  try { meta = await sharp(buf).metadata() } catch { refusees.push(`${a.nom} : pas une image`); continue }
  if (!['jpeg', 'png', 'webp'].includes(meta.format)) { refusees.push(`${a.nom} : format ${meta.format} refusé`); continue }
  const tourne = (meta.orientation ?? 1) >= 5
  const largeurOrig = tourne ? meta.height : meta.width
  let base = a.nom.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `photo-${a.i + 1}`
  while (bases.has(base)) base = `${base}-${a.i + 1}`
  const largeurs = LARGEURS.filter((l) => l <= largeurOrig)
  if (!largeurs.length) largeurs.push(largeurOrig)
  const entrees = []
  for (const l of largeurs) {
    for (const ext of ['webp', 'avif']) {
      const s = sharp(buf).rotate().resize({ width: l, withoutEnlargement: true })
      const out = await (ext === 'webp' ? s.webp({ quality: 80 }) : s.avif({ quality: 55 })).toBuffer({ resolveWithObject: true })
      fichiers.push({ rel: `photos/${base}-${l}.${ext}`, buf: out.data })
      entrees.push({ fichier: `images/${base}-${l}.${ext}`, largeur: out.info.width, hauteur: out.info.height })
    }
  }
  bases.add(base)
  for (const e of entrees) attributions.push({ fichier: e.fichier, base, largeur: e.largeur, hauteur: e.hauteur, largeurs, legende: a.p.legende || '', alt: a.p.legende || '', auteur: artisan?.nom || '', licence: 'propriétaire', source: a.p.url, modifiee: 'Oui — recadrée et compressée par Presti' })
  photosExport.push({ url: a.p.url, legende: a.p.legende, role: a.p.role, base })
}
if (photosExport.length < 3) { console.error(`✗ dossier incomplet : ${photosExport.length} photo(s) valide(s), 3 au moins${refusees.length ? `\n${refusees.map((r) => `  - ${r}`).join('\n')}` : ''}`); process.exit(3) }

// 3. commande.json au contrat de la fixture 025, plus matiere.prestations.
const sortie = {
  id: commande.id, etat: commande.etat, slug: artisan?.slug ?? null, nom: artisan?.nom ?? null, email: commande.email, telephone,
  metier: commande.metier, metiers_secondaires: commande.metiers_secondaires ?? [], communes: commande.communes ?? [],
  domaine_mode: commande.domaine_mode, domaine: commande.domaine ?? null,
  // Les choix du formulaire de devis (025-03, point 3) : les prestations déclarées, puis « Autre projet ».
  devis: { projets: [...(m.prestations ?? []), 'Autre projet'], delais: ['Dans les trois mois', 'Dans trois à six mois', 'Plus tard, je me renseigne'] },
  matiere: {
    photos: photosExport, logo_url: null, adresse: m.adresse, siren: m.siren, horaires: m.horaires, decennale: m.decennale,
    avis_google: m.avis_google ?? { url: '' }, artisan: m.artisan, prestations: m.prestations ?? [],
  },
}
fs.mkdirSync(path.join(SORTIE, 'photos'), { recursive: true })
for (const f of fichiers) fs.writeFileSync(path.join(SORTIE, f.rel), f.buf)
fs.writeFileSync(path.join(SORTIE, 'photos', 'attributions.json'), `${JSON.stringify(attributions, null, 1)}\n`)
fs.writeFileSync(path.join(SORTIE, 'commande.json'), `${JSON.stringify(sortie, null, 1)}\n`)
for (const r of refusees) console.log(`  refusée — ${r}`)
console.log(`✓ exporté : ${photosExport.length} photo(s), ${refusees.length} refusée(s), ${fichiers.length + 2} fichier(s) → ${SORTIE}`)
