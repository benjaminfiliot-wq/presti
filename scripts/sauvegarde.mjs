// Sauvegarde complète des données de Presti — chiffrée, sans mot de passe Postgres.
//
// Pourquoi ce script existe : l'audit final (auditeur F, majeur 12) a constaté qu'AUCUNE
// sauvegarde n'existait. L'offre Supabase actuelle n'en fait pas, le mot de passe Postgres est
// désaligné (donc pas de pg_dump), et une base perdue signifiait tout perdre : comptes,
// conversations, devis, et les factures que la loi impose de garder dix ans.
//
// Version 2 (lot L9 du chantier 4, 02/11) : la liste des tables n'est plus écrite à la main.
// L'ancienne liste figée couvrait 34 tables sur 92 ; chaque table ajoutée par une migration
// sortait de la sauvegarde sans que personne ne le voie. Désormais :
//   · les tables sont DÉCOUVERTES par la définition OpenAPI de PostgREST (`GET /rest/v1/`) ;
//   · une table n'est écartée que si elle figure dans `EXCLUES`, avec sa raison (comme
//     `HORS_LANCEUR` dans tout-verifier.mjs) ; une relation sans écriture (vue) est écartée
//     d'office, raison écrite ; rien ne disparaît en silence ;
//   · les tables sont rangées dans l'ordre des clés étrangères (les parents d'abord), lu dans
//     la même définition : c'est l'ordre de l'archive, donc celui d'une restauration ;
//   · le manifeste porte les tables, leurs comptes, leurs empreintes et l'ordre ;
//   · `--verifier` relit une archive et compare les comptes (complet avec la clé privée,
//     structurel sans elle : une archive tronquée échoue dans les deux cas).
// Preuve hors ligne : node scripts/sauvegarde-qa.mjs (doublure PostgREST, mutants).
//
// Ce qu'il sauvegarde, sans jamais avoir besoin du mot de passe de la base :
//   · toutes les tables du schéma `public`, page par page, triées par clé primaire ;
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
//   node scripts/sauvegarde.mjs --sans-chiffrer     → .json.gz en clair (poste de confiance seulement)
//   node scripts/sauvegarde.mjs --verifier <fichier> [--cle-privee <pem>] [--vivant]
//       relit l'archive : manifeste, longueur du corps, cohérence des tables et de l'ordre ;
//       avec la clé privée, déchiffre et compare table par table comptes et empreintes ;
//       avec --vivant, compare aussi les comptes du manifeste à la base (HEAD count=exact).
//   node scripts/sauvegarde.mjs --verifier --dernier --dossier <d>  → la plus récente du dossier
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { pathToFileURL } from 'node:url'

// ─── Ce qui est sauvegardé, ce qui ne l'est pas — et pourquoi ────────────────────────────────

// Les schémas lus par PostgREST. Une table nouvelle de ces schémas entre seule ; un schéma
// nouveau, lui, se déclare ici ou dans SCHEMAS_ECARTES.
export const SCHEMAS = ['public']

// Les schémas qu'on ne lit PAS par PostgREST, chacun avec sa raison. Ils sont écrits tels quels
// dans le manifeste : une archive dit elle-même ce qu'elle ne contient pas.
export const SCHEMAS_ECARTES = {
  ops: "fermé à PostgREST par construction (bus des agents, 0094/0096 : ops-sql-qa.mjs juge que `schema('ops')` est refusé, même avec la clé de service) ; ses 31 tables exigent pg_dump (mot de passe Postgres à réaligner, Q1) ou une fonction de service — point ouvert, dit dans le manifeste",
  auth: "les comptes passent par l'API admin (plus bas), sans empreintes de mots de passe, que Supabase ne rend pas",
  storage: "les fichiers passent par l'API de stockage (BUCKETS, plus bas)",
  cron: "les tâches pg_cron sont recréées par les migrations (0101, 0104, 0109, 0112), elles ne sont pas des données",
}

// Les tables publiques écartées exprès. Chaque entrée DOIT porter une raison lisible : une entrée
// vide ou trop courte fait refuser la sauvegarde (controlerExclues). Écarter une table est un
// geste qui se justifie, jamais un oubli.
export const EXCLUES = {
  codes_connexion: "codes de connexion à usage unique, hachés, qui expirent en minutes (0063_code_connexion.sql:20-25) : restaurés, ils seraient déjà périmés ; l'artisan en redemande un",
  sessions_verifiees: "marques de session (0063_code_connexion.sql:28-33) liées aux sessions d'auth, que l'API admin ne rend pas : après une restauration toutes les sessions sont neuves, ces lignes ne désigneraient plus rien",
}

export const BUCKETS = ['artisan-media', 'lead-media']
export const PAGE_DEFAUT = 1000
const RAISON_MIN = 12

// ─── Découverte, classement, ordre (fonctions pures, testées par sauvegarde-qa.mjs) ──────────

// Une raison est obligatoire pour chaque table écartée. Fail-closed : on refuse de sauvegarder
// plutôt que d'écarter une table sans dire pourquoi.
export function controlerExclues(exclues) {
  for (const [nom, raison] of Object.entries(exclues)) {
    if (typeof raison !== 'string' || raison.trim().length < RAISON_MIN) throw new Error(`EXCLUES : « ${nom} » est écartée sans raison lisible (${RAISON_MIN} caractères au moins)`)
  }
  return true
}

// Lit la définition OpenAPI (Swagger 2.0) que PostgREST sert sur `/rest/v1/`. Pour chaque
// relation : peut-on y écrire (POST présent : table, pas vue), sa clé primaire (`<pk/>`) et ses
// clés étrangères (`<fk table='…' column='…'/>`), notées par PostgREST dans la description
// des colonnes. Les fonctions (`/rpc/…`) ne sont pas des tables.
export function lireOpenApi(doc) {
  if (!doc || typeof doc !== 'object' || !doc.paths || !doc.definitions) throw new Error('définition OpenAPI illisible : ni `paths` ni `definitions`')
  const relations = []
  for (const [chemin, ops] of Object.entries(doc.paths)) {
    if (chemin === '/' || chemin.startsWith('/rpc/')) continue
    const nom = chemin.replace(/^\//, '')
    if (!nom || nom.includes('/')) continue
    const def = doc.definitions[nom] ?? {}
    const cle_primaire = []
    const parents = new Set()
    for (const [colonne, p] of Object.entries(def.properties ?? {})) {
      const d = String(p?.description ?? '')
      if (/<pk\/>/.test(d)) cle_primaire.push(colonne)
      for (const m of d.matchAll(/<fk table='([^']+)' column='([^']+)'\/>/g)) parents.add(m[1])
    }
    relations.push({ nom, ecriture: !!(ops && ops.post), cle_primaire, parents: [...parents] })
  }
  return relations
}

// Toute relation découverte est soit gardée, soit écartée AVEC sa raison. Il n'y a pas de
// troisième voie : c'est l'invariant que la suite vérifie sur l'archive.
export function classer(relations, exclues) {
  controlerExclues(exclues)
  const gardees = []
  const ecartees = {}
  for (const r of relations) {
    if (Object.hasOwn(exclues, r.nom)) ecartees[r.nom] = `EXCLUES : ${exclues[r.nom]}`
    else if (!r.ecriture) ecartees[r.nom] = "lecture seule (vue ou relation sans POST dans l'OpenAPI) : elle se recalcule depuis les tables, rien à restaurer"
    else gardees.push(r)
  }
  const connues = new Set(relations.map((r) => r.nom))
  const exclues_absentes = Object.keys(exclues).filter((n) => !connues.has(n))
  return { gardees, ecartees, exclues_absentes }
}

// Tri topologique (Kahn) : un parent passe toujours avant ses enfants. Les égalités se tranchent
// par ordre alphabétique, pour qu'une même base donne toujours le même ordre. Une clé vers
// soi-même (arbre) ne contraint pas l'ordre des tables ; un cycle est rangé en fin et signalé
// (sa restauration exige deux passes : lignes sans la clé, puis la clé).
export function ordreRestauration(gardees) {
  const noms = new Set(gardees.map((g) => g.nom))
  const parentsDe = new Map(gardees.map((g) => [g.nom, new Set(g.parents.filter((p) => p !== g.nom && noms.has(p)))]))
  const auto_references = gardees.filter((g) => g.parents.includes(g.nom)).map((g) => g.nom).sort()
  const parents_absents = {}
  for (const g of gardees) {
    const hors = g.parents.filter((p) => p !== g.nom && !noms.has(p))
    if (hors.length) parents_absents[g.nom] = hors.sort()
  }
  const ordre = []
  const restants = new Map([...parentsDe].map(([n, ps]) => [n, new Set(ps)]))
  for (;;) {
    const prets = [...restants].filter(([, ps]) => ps.size === 0).map(([n]) => n).sort()
    if (!prets.length) break
    for (const n of prets) {
      ordre.push(n)
      restants.delete(n)
      for (const ps of restants.values()) ps.delete(n)
    }
  }
  const cycles = [...restants.keys()].sort()
  ordre.push(...cycles)
  return { ordre, cycles, auto_references, parents_absents }
}

export const empreinte = (lignes) => crypto.createHash('sha256').update(JSON.stringify(lignes)).digest('hex')

// ─── Relecture d'une archive ─────────────────────────────────────────────────────────────────

export function lireArchive(fichier) {
  const brut = fs.readFileSync(fichier)
  if (fichier.endsWith('.json.gz')) return { clair: true, brut }
  const fin = brut.indexOf(0x0a)
  if (fin < 0) throw new Error("pas de manifeste : la première ligne de l'archive manque")
  return { clair: false, brut, manifeste: JSON.parse(brut.subarray(0, fin).toString('utf8')), corps: brut.subarray(fin + 1) }
}

// Rend la liste des erreurs (vide = archive saine) et le niveau atteint : « complet » quand le
// contenu a été déchiffré et recompté, « structurel » sans la clé privée.
export function verifierArchive(fichier, { clePrivee = null } = {}) {
  const erreurs = []
  let manifeste, donnees = null, niveau = 'structurel'
  let a
  try { a = lireArchive(fichier) } catch (e) { return { erreurs: [`archive illisible : ${e.message}`], niveau, manifeste: null } }

  if (a.clair) {
    try { donnees = JSON.parse(zlib.gunzipSync(a.brut).toString('utf8')) } catch (e) { return { erreurs: [`archive en clair abîmée : ${e.message}`], niveau, manifeste: null } }
    manifeste = donnees.manifeste ?? null
    if (!manifeste) return { erreurs: ['archive en clair sans manifeste (antérieure à la version 2)'], niveau, manifeste: null }
    niveau = 'complet'
  } else {
    manifeste = a.manifeste
    // AES-GCM ne change pas la longueur : le corps chiffré a exactement la taille du gzip.
    // Une archive coupée en route (copie interrompue, disque plein) se voit sans la clé.
    if (a.corps.length !== manifeste.octets_compresses) erreurs.push(`corps de ${a.corps.length} octets, le manifeste en annonce ${manifeste.octets_compresses} : archive tronquée ou allongée`)
    if (clePrivee) {
      try {
        const cleAes = crypto.privateDecrypt({ key: fs.readFileSync(clePrivee, 'utf8'), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(manifeste.cle_scellee, 'base64'))
        const d = crypto.createDecipheriv('aes-256-gcm', cleAes, Buffer.from(manifeste.iv, 'base64'))
        d.setAuthTag(Buffer.from(manifeste.tag, 'base64'))
        const corps = Buffer.concat([d.update(a.corps), d.final()])
        if (crypto.createHash('sha256').update(corps).digest('hex') !== manifeste.sha256_clair) erreurs.push('empreinte sha256 du contenu différente du manifeste')
        donnees = JSON.parse(zlib.gunzipSync(corps).toString('utf8'))
        niveau = 'complet'
      } catch (e) {
        erreurs.push(`déchiffrement impossible : ${e.message}`)
      }
    }
  }

  const lignes = manifeste.lignes ?? {}
  const tablesManifeste = Object.keys(lignes)
  if (manifeste.version >= 2) {
    const ordre = manifeste.ordre_restauration ?? []
    if (ordre.length !== tablesManifeste.length || ordre.some((t) => !Object.hasOwn(lignes, t))) erreurs.push("l'ordre de restauration ne couvre pas exactement les tables du manifeste")
    for (const [t, raison] of Object.entries(manifeste.ecartees ?? {})) if (typeof raison !== 'string' || raison.trim().length < RAISON_MIN) erreurs.push(`« ${t} » écartée sans raison`)
    for (const t of tablesManifeste) if (Object.hasOwn(manifeste.ecartees ?? {}, t)) erreurs.push(`« ${t} » à la fois sauvegardée et écartée`)
  }

  if (donnees) {
    const tablesArchive = Object.keys(donnees.tables ?? {})
    for (const t of tablesManifeste) {
      const attendu = lignes[t] === 'absente' ? 0 : lignes[t]
      const reel = (donnees.tables?.[t] ?? []).length
      if (attendu !== reel) erreurs.push(`${t} : ${reel} ligne(s) dans l'archive, le manifeste en annonce ${attendu}`)
      if (manifeste.empreintes && manifeste.empreintes[t] !== empreinte(donnees.tables?.[t] ?? [])) erreurs.push(`${t} : empreinte différente du manifeste`)
    }
    for (const t of tablesArchive) if (!Object.hasOwn(lignes, t)) erreurs.push(`${t} : dans l'archive mais absente du manifeste`)
    if (manifeste.version >= 2 && JSON.stringify(tablesArchive) !== JSON.stringify(manifeste.ordre_restauration)) erreurs.push("les tables de l'archive ne suivent pas l'ordre de restauration du manifeste")
    if ((donnees.comptes ?? []).length !== manifeste.comptes) erreurs.push(`comptes : ${(donnees.comptes ?? []).length} dans l'archive, le manifeste en annonce ${manifeste.comptes}`)
  }
  return { erreurs, niveau, manifeste }
}

// ─── Accès à Supabase (seulement quand on sauvegarde ou qu'on compare au vivant) ─────────────

function chargerEnv() {
  // Le fichier n'est lu que s'il manque une variable : un essai (doublure) n'y touche jamais.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return
  if (!fs.existsSync('.env.local')) return
  for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

function client() {
  chargerEnv()
  const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL_SB || !SERVICE) { console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires.'); process.exit(2) }
  const entetes = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` }
  const rest = async (chemin, opts = {}) => {
    const r = await fetch(`${URL_SB}${chemin}`, { ...opts, headers: { ...entetes, 'Content-Type': 'application/json', ...(opts.headers ?? {}) } })
    const texte = opts.method === 'HEAD' ? '' : await r.text()
    let json = null
    if (r.ok && texte) { try { json = JSON.parse(texte) } catch { json = null } }
    return { ok: r.ok, status: r.status, texte: r.ok ? null : texte, json, entetes: r.headers }
  }
  const brut = (chemin) => fetch(`${URL_SB}${chemin}`, { headers: entetes })
  return { URL_SB, rest, brut }
}

const totalDe = (entetes) => {
  const n = Number(String(entetes.get('content-range') ?? '').split('/')[1])
  return Number.isFinite(n) ? n : null
}

async function decouvrir(api) {
  // SCHEMAS ne compte que `public` : c'est le schéma que sert `/rest/v1/` sans en-tête de profil.
  const r = await api.rest('/rest/v1/', { headers: { Accept: 'application/openapi+json, application/json' } })
  if (!r.ok || !r.json) throw new Error(`définition OpenAPI de PostgREST illisible (${r.status}) : sauvegarde refusée plutôt que partielle`)
  const relations = lireOpenApi(r.json)
  if (!relations.some((x) => x.ecriture)) throw new Error("la définition OpenAPI ne montre aucune table : sauvegarde refusée plutôt que vide")
  return relations
}

async function lireTable(api, rel, page) {
  const lignes = []
  // Sans tri, PostgREST pagine dans un ordre libre : une ligne peut sauter d'une page à l'autre
  // et manquer à la sauvegarde. On trie par clé primaire quand il y en a une.
  const tri = rel.cle_primaire.length ? `&order=${rel.cle_primaire.map((c) => `${encodeURIComponent(c)}.asc`).join(',')}` : ''
  let total = null
  for (let de = 0; ; de += page) {
    const r = await api.rest(`/rest/v1/${encodeURIComponent(rel.nom)}?select=*${tri}&limit=${page}&offset=${de}`, { headers: de === 0 ? { Prefer: 'count=exact' } : {} })
    if (!r.ok) throw new Error(`${rel.nom} : ${r.status} ${(r.texte ?? '').slice(0, 120)}`)
    if (!Array.isArray(r.json)) throw new Error(`${rel.nom} : réponse qui n'est pas une liste`)
    if (de === 0) total = totalDe(r.entetes)
    lignes.push(...r.json)
    if (r.json.length < page) break
  }
  return { lignes, total }
}

async function comptes(api) {
  const out = []
  for (let page = 1; ; page++) {
    const r = await api.rest(`/auth/v1/admin/users?page=${page}&per_page=200`)
    if (!r.ok) throw new Error(`comptes : ${r.status}`)
    const users = r.json?.users ?? []
    // Jamais les empreintes de mot de passe : Supabase ne les rend pas, et on n'en veut pas.
    out.push(...users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, email_confirmed_at: u.email_confirmed_at, last_sign_in_at: u.last_sign_in_at, banned_until: u.banned_until, user_metadata: u.user_metadata })))
    if (users.length < 200) break
  }
  return out
}

async function stockage(api, avecFichiers) {
  const inventaire = {}
  const fichiers = {}
  const lister = (b, prefix) => api.rest(`/storage/v1/object/list/${encodeURIComponent(b)}`, { method: 'POST', body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } }) })
  for (const b of BUCKETS) {
    inventaire[b] = []
    const racine = await lister(b, '')
    if (!racine.ok) { inventaire[b] = [{ erreur: `${racine.status}` }]; continue }
    for (const dossier of racine.json ?? []) {
      const sous = await lister(b, dossier.name)
      if (!sous.ok) continue
      for (const f of sous.json ?? []) {
        const chemin = `${dossier.name}/${f.name}`
        inventaire[b].push({ chemin, taille: f.metadata?.size ?? null, type: f.metadata?.mimetype ?? null, modifie: f.updated_at ?? null })
        if (avecFichiers && f.metadata?.size) {
          const r = await api.brut(`/storage/v1/object/${encodeURIComponent(b)}/${chemin.split('/').map(encodeURIComponent).join('/')}`)
          if (r.ok) fichiers[`${b}/${chemin}`] = Buffer.from(await r.arrayBuffer()).toString('base64')
        }
      }
    }
  }
  return { inventaire, fichiers }
}

// ─── Lignes de commande ──────────────────────────────────────────────────────────────────────

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d }
const flag = (k) => process.argv.includes(k)

async function commandeVerifier() {
  let f = arg('--verifier', null)
  if (!f && flag('--dernier')) {
    const d = arg('--dossier', 'sauvegardes')
    const tous = fs.existsSync(d) ? fs.readdirSync(d).filter((x) => /\.(presti|json\.gz)$/.test(x)).sort() : []
    f = tous.length ? path.join(d, tous[tous.length - 1]) : null
  }
  if (!f) { console.error('--verifier <fichier> (ou --verifier --dernier --dossier <d>)'); process.exit(2) }
  const clePrivee = arg('--cle-privee', null)
  if (clePrivee && !fs.existsSync(clePrivee)) { console.error(`❌ clé privée introuvable : ${clePrivee}`); process.exit(2) }
  const { erreurs, niveau, manifeste } = verifierArchive(f, { clePrivee })
  console.log(`▶ Vérification de ${f}`)
  if (manifeste) {
    const n = Object.keys(manifeste.lignes ?? {}).length
    const total = Object.values(manifeste.lignes ?? {}).filter((v) => typeof v === 'number').reduce((x, y) => x + y, 0)
    console.log(`  manifeste version ${manifeste.version}, fait le ${manifeste.fait_le} : ${n} tables, ${total} lignes, ${manifeste.comptes} comptes`)
    for (const [t, r] of Object.entries(manifeste.ecartees ?? {})) console.log(`  écartée ${t} — ${r}`)
    for (const [s, r] of Object.entries(manifeste.schemas_ecartes ?? {})) console.log(`  schéma écarté ${s} — ${r}`)
  }
  if (flag('--vivant') && manifeste) {
    // Comparaison au vivant : compte exact de chaque table, sans télécharger les lignes.
    const api = client()
    for (const t of Object.keys(manifeste.lignes ?? {})) {
      const r = await api.rest(`/rest/v1/${encodeURIComponent(t)}?select=*`, { method: 'HEAD', headers: { Prefer: 'count=exact', Range: '0-0' } })
      const vivant = r.ok ? totalDe(r.entetes) : null
      const attendu = manifeste.lignes[t] === 'absente' ? 0 : manifeste.lignes[t]
      if (vivant !== attendu) erreurs.push(`${t} : ${attendu} dans l'archive, ${vivant ?? `illisible (${r.status})`} en base`)
    }
  }
  console.log(`  niveau ${niveau}${niveau === 'structurel' ? ' (sans clé privée : longueur et cohérence du manifeste ; le contenu reste scellé)' : ' (contenu déchiffré, recompté table par table)'}`)
  for (const e of erreurs) console.log(`  ❌ ${e}`)
  console.log(erreurs.length ? `\n❌ ${erreurs.length} écart(s) : archive à ne pas croire` : `\n✅ archive relue, comptes égaux${flag('--vivant') ? ' (et égaux à la base)' : ''}`)
  process.exit(erreurs.length ? 1 : 0)
}

async function commandeSauvegarder() {
  const DOSSIER = arg('--dossier', 'sauvegardes')
  const CLE_PUBLIQUE = arg('--cle-publique', 'cle-sauvegarde.pub.pem')
  const PAGE = Number(process.env.SAUVEGARDE_PAGE) > 0 ? Number(process.env.SAUVEGARDE_PAGE) : PAGE_DEFAUT
  if (!flag('--sans-chiffrer') && !fs.existsSync(CLE_PUBLIQUE)) {
    console.error(`\n❌ Clé publique absente : ${CLE_PUBLIQUE}\n   Créez la paire une fois : node scripts/cle-sauvegarde.mjs`)
    process.exit(2)
  }
  const api = client()
  console.log('▶ Sauvegarde de Presti')
  const debut = Date.now()

  const relations = await decouvrir(api)
  const { gardees, ecartees, exclues_absentes } = classer(relations, EXCLUES)
  const { ordre, cycles, auto_references, parents_absents } = ordreRestauration(gardees)
  const parNom = new Map(gardees.map((g) => [g.nom, g]))
  console.log(`  ${relations.length} relations découvertes : ${gardees.length} tables sauvegardées, ${Object.keys(ecartees).length} écartées`)
  for (const n of exclues_absentes) console.log(`  ⚠️ EXCLUES nomme « ${n} », absente de la base : entrée à retirer`)
  if (cycles.length) console.log(`  ⚠️ cycle de clés étrangères : ${cycles.join(', ')} (restauration en deux passes)`)

  // L'objet `tables` est rempli dans l'ordre de restauration : qui parcourt l'archive dans
  // l'ordre de ses clés (restaurer.mjs le fait) restaure les parents avant les enfants.
  const donnees = { version: 2, ordre_restauration: ordre, cles_etrangeres: Object.fromEntries(gardees.map((g) => [g.nom, g.parents])), tables: {}, comptes: [], stockage: {} }
  const compteur = {}, comptesExacts = {}, empreintes = {}, ecarts = []
  for (const t of ordre) {
    const { lignes, total } = await lireTable(api, parNom.get(t), PAGE)
    donnees.tables[t] = lignes
    compteur[t] = lignes.length
    comptesExacts[t] = total
    empreintes[t] = empreinte(lignes)
    if (total !== null && total !== lignes.length) ecarts.push(`${t} : ${lignes.length} lues, ${total} comptées par la base (écritures pendant la sauvegarde ?)`)
    process.stdout.write(`  ${t} ${lignes.length}\n`)
  }
  donnees.comptes = await comptes(api)
  console.log(`  comptes d'authentification ${donnees.comptes.length}`)
  const st = await stockage(api, flag('--fichiers'))
  donnees.stockage = st
  const nbFichiers = Object.values(st.inventaire).reduce((n, l) => n + l.length, 0)
  console.log(`  fichiers de stockage ${nbFichiers}${flag('--fichiers') ? ` (contenu embarqué : ${Object.keys(st.fichiers).length})` : ' (inventaire seul)'}`)
  for (const e of ecarts) console.log(`  ⚠️ ${e}`)

  const manifeste = {
    version: 2,
    fait_le: new Date().toISOString(),
    projet: api.URL_SB.replace(/^https?:\/\//, '').split('.')[0],
    decouverte: "définition OpenAPI de PostgREST (GET /rest/v1/), aucune liste écrite à la main",
    schemas: SCHEMAS,
    relations_decouvertes: relations.length,
    lignes: compteur,
    comptes_exacts: comptesExacts,
    empreintes,
    ecarts_de_lecture: ecarts,
    ecartees,
    schemas_ecartes: SCHEMAS_ECARTES,
    exclues_absentes,
    ordre_restauration: ordre,
    cycles,
    auto_references,
    parents_absents,
    comptes: donnees.comptes.length,
    fichiers_stockage: nbFichiers,
    contenu_fichiers: flag('--fichiers'),
    schema: 'non inclus — supabase/migrations dans git est la source du schéma',
    mots_de_passe: 'non inclus — une restauration exige une réinitialisation par chaque artisan',
    chiffrement: flag('--sans-chiffrer') ? 'aucun' : 'AES-256-GCM, clé chiffrée en RSA-4096-OAEP',
  }

  const horodatage = new Date().toISOString().replace(/[:.]/g, '-')
  fs.mkdirSync(DOSSIER, { recursive: true })
  let sortie
  if (flag('--sans-chiffrer')) {
    donnees.manifeste = manifeste
    const corps = zlib.gzipSync(Buffer.from(JSON.stringify(donnees)), { level: 9 })
    sortie = path.join(DOSSIER, `${horodatage}.json.gz`)
    fs.writeFileSync(sortie, corps)
  } else {
    const corps = zlib.gzipSync(Buffer.from(JSON.stringify(donnees)), { level: 9 })
    manifeste.octets_compresses = corps.length
    manifeste.sha256_clair = crypto.createHash('sha256').update(corps).digest('hex')
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

  const total = Object.values(compteur).reduce((a, b) => a + b, 0)
  console.log(`\n✅ ${sortie} — ${ordre.length} tables, ${total} lignes, ${donnees.comptes.length} comptes, ${(fs.statSync(sortie).size / 1024).toFixed(0)} Ko, ${((Date.now() - debut) / 1000).toFixed(0)} s`)
  if (!flag('--sans-chiffrer')) console.log('   Chiffrée : cette machine ne peut pas la relire. Seule la clé privée le peut.')
  console.log(`   Relire : node scripts/sauvegarde.mjs --verifier ${sortie}`)
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (direct) {
  try {
    if (flag('--verifier')) await commandeVerifier()
    else await commandeSauvegarder()
  } catch (e) {
    console.error(`\n❌ ${e.message}`)
    process.exit(1)
  }
}
