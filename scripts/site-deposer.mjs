// scripts/site-deposer.mjs — dépose un site généré dans le bucket privé « sites » et passe la commande à `generee`
// (v15 §3.2 : payee → generee). Rien ne se dépose sans le juge : scripts/site-qa.mjs doit être VERT sur le dossier,
// et ses scores sont enregistrés sur la commande (le Poste de contrôle les montre avant de valider).
//
// Usage : node scripts/site-deposer.mjs <commande_id> <dossier>            (juge complet, Lighthouse compris)
//         node scripts/site-deposer.mjs <commande_id> <dossier> --statique (sans Lighthouse : pour un aperçu intermédiaire — la commande
//                                                                          reste en payee, les scores ne sont PAS enregistrés)
// Sortie : l'adresse de l'aperçu privé. Codes : 0 déposé ; 1 juge rouge ou dépôt impossible ; 2 usage.
// Env (.env.local) : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Le stockage est partagé (1 Go) : on refuse
// si moins de 400 Mo resteraient libres, comme scripts/promo-heberger.mjs.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const [commandeId, dossierArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const STATIQUE = process.argv.includes('--statique')
if (!commandeId || !dossierArg || !/^[0-9a-f-]{36}$/i.test(commandeId)) { console.error('Usage : node scripts/site-deposer.mjs <commande_id> <dossier> [--statique]'); process.exit(2) }
const dossier = path.resolve(dossierArg)
if (!fs.existsSync(path.join(dossier, 'index.html')) || !fs.existsSync(path.join(dossier, 'site.json'))) { console.error('✗ le dossier doit contenir index.html et site.json'); process.exit(2) }
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !SERVICE) { console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants'); process.exit(2) }
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
const BUCKET = 'sites', MARGE_MO = 400, QUOTA_MO = 1024
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' }

// 1. La commande existe et est dans un état qui accepte un dépôt.
const { data: commande, error: eC } = await admin.from('sites_commandes').select('id, etat, apercu_jeton, regenerations').eq('id', commandeId).maybeSingle()
if (eC || !commande) { console.error(`✗ commande ${commandeId} introuvable${eC ? ' : ' + eC.message : ''}`); process.exit(1) }
if (!['payee', 'generee'].includes(commande.etat)) { console.error(`✗ commande en état « ${commande.etat} » : on ne dépose que sur payee ou generee`); process.exit(1) }

// 2. Le juge — vert, ou rien.
console.log(`── le juge sur ${dossier}${STATIQUE ? ' (statique)' : ''}`)
const j = spawnSync(process.execPath, ['scripts/site-qa.mjs', dossier, '--json', ...(STATIQUE ? ['--statique'] : [])], { encoding: 'utf8', maxBuffer: 64 << 20 })
let rapport = null
try { rapport = JSON.parse(j.stdout) } catch { /* pas de JSON */ }
if (j.status !== 0 || !rapport) {
  const echecs = rapport ? rapport.blocs.flatMap((b) => b.tests.filter((t) => !t.passe).map((t) => `${b.nom} › ${t.nom} (${t.mesure})`)) : [(j.stderr || j.stdout).slice(0, 300)]
  console.error(`✗ le juge refuse (${echecs.length} critère(s)) :\n  ${echecs.slice(0, 12).join('\n  ')}`)
  process.exit(1)
}
const lighthouse = rapport.blocs.find((b) => /^Lighthouse mobile/.test(b.nom))
const scores = lighthouse ? Object.fromEntries(lighthouse.tests.filter((t) => /Lighthouse mobile ·/.test(t.nom)).map((t) => [t.nom.replace(/^Lighthouse mobile · /, '').replace(/ ≥ \d+$/, ''), Number(t.mesure)])) : null
console.log(`  ✓ juge vert${scores ? ' · ' + Object.entries(scores).map(([k, v]) => `${k} ${v}`).join(' · ') : ''}`)

// 3. La place. Le stockage est partagé (QUOTA_MO) : un site ne doit pas dépasser TAILLE_SITE_MAX_MO, et on rappelle la
// marge à garder — la mesure exacte de l'occupation (tous buckets) est celle de scripts/promo-heberger.mjs.
const { data: objets } = await admin.storage.from(BUCKET).list(commandeId, { limit: 1000 })
const TAILLE_SITE_MAX_MO = 20
const fichiers = []
const rec = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) rec(p); else fichiers.push(p) } }
rec(dossier)
const taille = fichiers.reduce((s, f) => s + fs.statSync(f).size, 0)
console.log(`── ${fichiers.length} fichier(s), ${(taille / 1048576).toFixed(1)} Mo${objets?.length ? ` · remplace un dépôt existant` : ''} · quota partagé ${QUOTA_MO} Mo, marge à garder ${MARGE_MO} Mo`)
if (taille / 1048576 > TAILLE_SITE_MAX_MO) { console.error(`✗ ${(taille / 1048576).toFixed(1)} Mo : un site ne dépasse pas ${TAILLE_SITE_MAX_MO} Mo (images à recompresser)`); process.exit(1) }

// 4. Le dépôt (upsert : un nouveau dépôt remplace l'ancien fichier par fichier ; ce qui n'existe plus est retiré).
const nouveaux = new Set()
for (const f of fichiers) {
  const rel = path.relative(dossier, f).split(path.sep).join('/')
  const objet = `${commandeId}/${rel}`
  nouveaux.add(rel)
  const type = TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream'
  const { error } = await admin.storage.from(BUCKET).upload(objet, fs.readFileSync(f), { contentType: type, upsert: true, cacheControl: '3600' })
  if (error) { console.error(`✗ ${rel} : ${error.message}`); process.exit(1) }
}
// Les fichiers de l'ancien dépôt qui n'existent plus (à la racine seulement : les sous-dossiers sont écrasés fichier par fichier).
const orphelins = (objets ?? []).filter((o) => o.name && !nouveaux.has(o.name) && o.id).map((o) => `${commandeId}/${o.name}`)
if (orphelins.length) await admin.storage.from(BUCKET).remove(orphelins)
console.log(`  ✓ déposé dans ${BUCKET}/${commandeId}/`)

// 5. La commande : generee (si le juge complet a tourné), scores, vérifications, jeton d'aperçu.
const jeton = commande.apercu_jeton || crypto.randomBytes(24).toString('base64url')
const maj = { apercu_jeton: jeton, modifie_le: new Date().toISOString(), ...(STATIQUE ? {} : { etat: 'generee', genere_le: new Date().toISOString(), scores, verifications: rapport }) }
const { error: eMaj } = await admin.from('sites_commandes').update(maj).eq('id', commandeId)
if (eMaj) { console.error(`✗ mise à jour de la commande impossible : ${eMaj.message}`); process.exit(1) }
const base = process.env.TEST_BASE || 'https://prestiapp.fr'
console.log(`\n✓ ${STATIQUE ? 'aperçu intermédiaire déposé (commande inchangée : ' + commande.etat + ')' : 'commande generee'}\n  aperçu privé : ${base}/site-genere/${commandeId}/?apercu=${jeton}`)
