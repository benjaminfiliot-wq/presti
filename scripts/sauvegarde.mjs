// Sauvegarde complète des données de Presti — chiffrée, sans mot de passe Postgres.
//
// Pourquoi ce script existe : l'audit final (auditeur F, majeur 12) a constaté qu'AUCUNE
// sauvegarde n'existait. L'offre Supabase actuelle n'en fait pas, le mot de passe Postgres est
// désaligné (donc pas de pg_dump), et une base perdue signifiait tout perdre : comptes,
// conversations, devis, et les factures que la loi impose de garder dix ans.
//
// Ce qu'il sauvegarde, sans jamais avoir besoin du mot de passe de la base :
//   · toutes les tables publiques, page par page, par l'API de service (PostgREST) ;
//   · les comptes d'authentification (API admin) — sans les empreintes de mots de passe,
//     que Supabase ne rend pas : une restauration recrée les comptes et exige une
//     réinitialisation de mot de passe, c'est dit dans le manifeste ;
//   · l'inventaire des fichiers de stockage (chemins, tailles) et, avec --fichiers, leur contenu.
// Le SCHÉMA n'est pas sauvegardé ici : il vit dans supabase/migrations, versionné dans git.
// Restauration = migrations rejouées + ce dump. C'est la paire qui fait la sauvegarde.
//
// CHIFFREMENT (hybride, sans dépendance) : une clé AES-256-GCM tirée au hasard chiffre l'archive,
// et cette clé est elle-même chiffrée avec une clé PUBLIQUE RSA-4096. Conséquence : la machine qui
// sauvegarde (y compris un serveur d'intégration continue) peut écrire une sauvegarde mais ne peut
// PAS la relire. Seul celui qui détient la clé privée le peut. Voir scripts/cle-sauvegarde.mjs.
//
// Usage :
//   node scripts/sauvegarde.mjs                     → sauvegardes/<horodatage>.presti (chiffrée)
//   node scripts/sauvegarde.mjs --dossier D:/copies → ailleurs
//   node scripts/sauvegarde.mjs --fichiers          → embarque aussi les images du stockage
//   node scripts/sauvegarde.mjs --sans-chiffrer     → .json en clair (poste de confiance seulement)
//   node scripts/sauvegarde.mjs --verifier <fichier> → relit le manifeste sans déchiffrer le contenu
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !SERVICE) { console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires.'); process.exit(2) }

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d }
const flag = (k) => process.argv.includes(k)
const DOSSIER = arg('--dossier', 'sauvegardes')
const CLE_PUBLIQUE = arg('--cle-publique', 'cle-sauvegarde.pub.pem')
const PAGE = 1000

// Les tables publiques, dans un ordre où une restauration ne casse aucune clé étrangère :
// les parents d'abord. `artisans` dépend de auth.users, restauré en premier.
const TABLES = [
  'artisans', 'plateforme_config', 'regles_automatisation', 'canaux',
  'clients', 'clients_plateforme', 'clients_liens', 'clients_sessions',
  'leads', 'messages', 'relances',
  'devis', 'devis_lignes', 'factures', 'factures_lignes',
  'fournisseurs', 'materiaux', 'stock', 'mouvements_stock', 'listes_achat', 'lignes_achat', 'postes_types',
  'prix_artisan', 'prix_observations', 'recherche_cache',
  'limites', 'ip_abus', 'ip_bans', 'password_resets', 'app_errors', 'plat_events', 'passages_cron',
]
const BUCKETS = ['artisan-media', 'lead-media']

const rest = async (chemin, opts = {}) => {
  const r = await fetch(`${URL_SB}${chemin}`, { ...opts, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(opts.headers ?? {}) } })
  return { ok: r.ok, status: r.status, texte: r.ok ? null : await r.text(), json: r.ok ? await r.json().catch(() => null) : null }
}

async function table(nom) {
  const lignes = []
  for (let de = 0; ; de += PAGE) {
    const r = await rest(`/rest/v1/${nom}?select=*&limit=${PAGE}&offset=${de}`)
    if (!r.ok) {
      // Une table absente (migration non appliquée) n'est pas une panne de sauvegarde : on le dit.
      if (r.status === 404 || /does not exist|schema cache/i.test(r.texte ?? '')) return { absente: true, lignes: [] }
      throw new Error(`${nom} : ${r.status} ${(r.texte ?? '').slice(0, 120)}`)
    }
    lignes.push(...r.json)
    if (r.json.length < PAGE) break
  }
  return { absente: false, lignes }
}

async function comptes() {
  const out = []
  for (let page = 1; ; page++) {
    const r = await rest(`/auth/v1/admin/users?page=${page}&per_page=200`)
    if (!r.ok) throw new Error(`comptes : ${r.status}`)
    const users = r.json.users ?? []
    // Jamais les empreintes de mot de passe : Supabase ne les rend pas, et on n'en veut pas.
    out.push(...users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, email_confirmed_at: u.email_confirmed_at, last_sign_in_at: u.last_sign_in_at, banned_until: u.banned_until, user_metadata: u.user_metadata })))
    if (users.length < 200) break
  }
  return out
}

async function stockage(avecFichiers) {
  const inventaire = {}
  const fichiers = {}
  for (const b of BUCKETS) {
    inventaire[b] = []
    const racine = await rest(`/storage/v1/object/list/${b}`, { method: 'POST', body: JSON.stringify({ prefix: '', limit: 1000, sortBy: { column: 'name', order: 'asc' } }) })
    if (!racine.ok) { inventaire[b] = [{ erreur: `${racine.status}` }]; continue }
    for (const dossier of racine.json) {
      const sous = await rest(`/storage/v1/object/list/${b}`, { method: 'POST', body: JSON.stringify({ prefix: dossier.name, limit: 1000, sortBy: { column: 'name', order: 'asc' } }) })
      if (!sous.ok) continue
      for (const f of sous.json) {
        const chemin = `${dossier.name}/${f.name}`
        inventaire[b].push({ chemin, taille: f.metadata?.size ?? null, type: f.metadata?.mimetype ?? null, modifie: f.updated_at ?? null })
        if (avecFichiers && f.metadata?.size) {
          const r = await fetch(`${URL_SB}/storage/v1/object/${b}/${chemin}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })
          if (r.ok) fichiers[`${b}/${chemin}`] = Buffer.from(await r.arrayBuffer()).toString('base64')
        }
      }
    }
  }
  return { inventaire, fichiers }
}

if (flag('--verifier')) {
  const f = arg('--verifier', null) || process.argv[process.argv.indexOf('--verifier') + 1]
  const brut = fs.readFileSync(f)
  const fin = brut.indexOf(0x0a)
  const manifeste = JSON.parse(brut.subarray(0, fin).toString('utf8'))
  console.log(JSON.stringify(manifeste, null, 1))
  console.log(`\ncorps chiffré : ${(brut.length - fin - 1)} octets — déchiffrable avec scripts/restaurer.mjs et la clé privée`)
  process.exit(0)
}

console.log('▶ Sauvegarde de Presti')
const debut = Date.now()
const donnees = { tables: {}, comptes: [], stockage: {} }
const compteur = {}
for (const t of TABLES) {
  const r = await table(t)
  donnees.tables[t] = r.lignes
  compteur[t] = r.absente ? 'absente' : r.lignes.length
  process.stdout.write(`  ${t} ${r.absente ? '(absente)' : r.lignes.length}\n`)
}
donnees.comptes = await comptes()
console.log(`  comptes d'authentification ${donnees.comptes.length}`)
const st = await stockage(flag('--fichiers'))
donnees.stockage = st
const nbFichiers = Object.values(st.inventaire).reduce((n, l) => n + l.length, 0)
console.log(`  fichiers de stockage ${nbFichiers}${flag('--fichiers') ? ` (contenu embarqué : ${Object.keys(st.fichiers).length})` : ' (inventaire seul)'}`)

const corps = zlib.gzipSync(Buffer.from(JSON.stringify(donnees)), { level: 9 })
const empreinte = crypto.createHash('sha256').update(corps).digest('hex')
const horodatage = new Date().toISOString().replace(/[:.]/g, '-')
fs.mkdirSync(DOSSIER, { recursive: true })

const manifeste = {
  version: 1,
  fait_le: new Date().toISOString(),
  projet: URL_SB.replace(/^https?:\/\//, '').split('.')[0],
  lignes: compteur,
  comptes: donnees.comptes.length,
  fichiers_stockage: nbFichiers,
  contenu_fichiers: flag('--fichiers'),
  octets_compresses: corps.length,
  sha256_clair: empreinte,
  schema: 'non inclus — supabase/migrations dans git est la source du schéma',
  mots_de_passe: 'non inclus — une restauration exige une réinitialisation par chaque artisan',
  chiffrement: flag('--sans-chiffrer') ? 'aucun' : 'AES-256-GCM, clé chiffrée en RSA-4096-OAEP',
}

let sortie
if (flag('--sans-chiffrer')) {
  sortie = path.join(DOSSIER, `${horodatage}.json.gz`)
  fs.writeFileSync(sortie, corps)
} else {
  if (!fs.existsSync(CLE_PUBLIQUE)) {
    console.error(`\n❌ Clé publique absente : ${CLE_PUBLIQUE}\n   Créez la paire une fois : node scripts/cle-sauvegarde.mjs`)
    process.exit(2)
  }
  const cleAes = crypto.randomBytes(32)
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', cleAes, iv)
  const chiffre = Buffer.concat([c.update(corps), c.final()])
  const tag = c.getAuthTag()
  const cleScellee = crypto.publicEncrypt({ key: fs.readFileSync(CLE_PUBLIQUE, 'utf8'), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, cleAes)
  manifeste.iv = iv.toString('base64')
  manifeste.tag = tag.toString('base64')
  manifeste.cle_scellee = cleScellee.toString('base64')
  sortie = path.join(DOSSIER, `${horodatage}.presti`)
  // Manifeste en clair sur la première ligne (lisible sans clé), corps chiffré ensuite.
  fs.writeFileSync(sortie, Buffer.concat([Buffer.from(JSON.stringify(manifeste) + '\n'), chiffre]))
}

const total = Object.values(compteur).filter((v) => typeof v === 'number').reduce((a, b) => a + b, 0)
console.log(`\n✅ ${sortie} — ${total} lignes, ${donnees.comptes.length} comptes, ${(fs.statSync(sortie).size / 1024).toFixed(0)} Ko, ${((Date.now() - debut) / 1000).toFixed(0)} s`)
if (!flag('--sans-chiffrer')) console.log('   Chiffrée : cette machine ne peut pas la relire. Seule la clé privée le peut.')
