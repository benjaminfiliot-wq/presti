// Preuve HORS LIGNE de scripts/sauvegarde.mjs (lot L9 du chantier 4, 02/11).
//
// Aucune vraie base, aucun secret, aucun réseau sortant : une doublure PostgREST tourne sur
// 127.0.0.1 (port tiré au hasard), servie depuis scripts/fixtures/sauvegarde-qa/doublure.json
// (données fictives). La sauvegarde est lancée comme en vrai (processus séparé, dossier jetable,
// paire de clés RSA jetable), puis relue par `--verifier`.
//
// Ce que la suite prouve :
//   1. toutes les tables découvertes par l'OpenAPI entrent, sauf celles écartées AVEC leur raison ;
//   2. une table nouvelle entre sans changer le code ;
//   3. une table écartée sans raison fait rougir (EXCLUES contrôlée, archive contrôlée) ;
//   4. l'ordre de restauration respecte les clés étrangères fictives (parents d'abord) ;
//   5. une archive tronquée échoue à `--verifier`, avec et sans clé privée ; un manifeste
//      falsifié échoue avec la clé ; `--vivant` voit une base qui a bougé ;
//   6. pagination triée par clé primaire, OpenAPI en panne = refus (aucune archive) ;
//   7. des MUTANTS (liste figée remise, ordre inversé, comptes non comparés, raison non exigée,
//      troncature ignorée, pagination coupée, tri retiré, EXCLUES ignorée) font tous rougir la
//      suite : elle sait échouer.
// La vérité attendue (tables, clés, cycles) est écrite à la main dans la fixture, bloc `attendu` :
// jamais recalculée par le script testé.
//
// Usage : node scripts/sauvegarde-qa.mjs [--bavard]     (code de sortie 0 = vert)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT = path.join(ICI, 'sauvegarde.mjs')
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ICI, 'fixtures/sauvegarde-qa/doublure.json'), 'utf8'))
const CLE_FICTIVE = `cle-fictive-qa-${crypto.randomBytes(6).toString('hex')}`
const BAVARD = process.argv.includes('--bavard')
const clone = (x) => JSON.parse(JSON.stringify(x))

// L'ancienne liste figée de sauvegarde.mjs (v1, l.49-59) : le mutant « liste figée » la remet.
const ANCIENNE_LISTE = ['artisans', 'plateforme_config', 'regles_automatisation', 'canaux', 'clients', 'clients_plateforme', 'clients_liens', 'clients_sessions', 'leads', 'messages', 'relances', 'devis', 'devis_lignes', 'factures', 'factures_lignes', 'fournisseurs', 'materiaux', 'stock', 'mouvements_stock', 'listes_achat', 'lignes_achat', 'postes_types', 'prix_artisan', 'prix_observations', 'recherche_cache', 'limites', 'ip_abus', 'ip_bans', 'password_resets', 'app_errors', 'plat_events', 'passages_cron', 'assistant_conversations', 'assistant_journal']

// ─── La doublure PostgREST ───────────────────────────────────────────────────────────────────

function doublure(etat) {
  const journal = { requetes: [], inattendues: [] }
  let rotation = 0
  const comparer = (cols) => (x, y) => { for (const c of cols) { const a = String(x[c] ?? ''), b = String(y[c] ?? ''); if (a !== b) return a < b ? -1 : 1 } return 0 }
  const serveur = http.createServer((req, res) => {
    let corps = ''
    req.on('data', (d) => { corps += d })
    req.on('end', () => {
      const u = new URL(req.url, 'http://127.0.0.1')
      journal.requetes.push({ methode: req.method, chemin: u.pathname, recherche: u.search })
      const json = (code, objet, entetes = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...entetes }); res.end(req.method === 'HEAD' ? '' : JSON.stringify(objet)) }
      if (req.headers.apikey !== CLE_FICTIVE || req.headers.authorization !== `Bearer ${CLE_FICTIVE}`) { journal.inattendues.push(`sans clé : ${req.method} ${u.pathname}`); return json(401, { message: 'clé absente' }) }
      if (u.pathname === '/rest/v1/' && req.method === 'GET') {
        if (etat.openapiEnPanne) return json(503, { message: 'en panne (doublure)' })
        return json(200, etat.openapi)
      }
      const t = u.pathname.match(/^\/rest\/v1\/([^/]+)$/)
      if (t && (req.method === 'GET' || req.method === 'HEAD')) {
        const nom = decodeURIComponent(t[1])
        if (!etat.openapi.paths[`/${nom}`] || !etat.lignes[nom]) return json(404, { code: 'PGRST205', message: `Could not find the table 'public.${nom}' in the schema cache` })
        let lignes = [...etat.lignes[nom]]
        const ordre = u.searchParams.get('order')
        if (ordre) lignes.sort(comparer(ordre.split(',').map((x) => x.split('.')[0])))
        else if (lignes.length > 1) { const k = rotation++ % lignes.length; lignes = [...lignes.slice(k), ...lignes.slice(0, k)] } // ordre libre, comme Postgres sans ORDER BY
        const total = lignes.length
        if (req.method === 'HEAD') {
          const e = /count=exact/.test(req.headers.prefer ?? '') ? { 'Content-Range': `0-${Math.max(0, Math.min(total, 1) - 1)}/${total}` } : {}
          return json(200, null, e)
        }
        const de = Number(u.searchParams.get('offset') ?? 0)
        const n = Number(u.searchParams.get('limit') ?? total)
        const page = lignes.slice(de, de + n)
        const e = /count=exact/.test(req.headers.prefer ?? '') ? { 'Content-Range': page.length ? `${de}-${de + page.length - 1}/${total}` : `*/${total}` } : {}
        return json(200, page, e)
      }
      if (u.pathname === '/auth/v1/admin/users' && req.method === 'GET') {
        const p = Number(u.searchParams.get('page') ?? 1), par = Number(u.searchParams.get('per_page') ?? 50)
        return json(200, { users: etat.comptes.slice((p - 1) * par, p * par) })
      }
      const l = u.pathname.match(/^\/storage\/v1\/object\/list\/([^/]+)$/)
      if (l && req.method === 'POST') {
        const b = etat.stockage[decodeURIComponent(l[1])]
        if (!b) return json(400, { message: 'bucket inconnu' })
        const prefix = JSON.parse(corps || '{}').prefix ?? ''
        if (!prefix) return json(200, Object.keys(b).map((name) => ({ name, id: null, metadata: null })))
        return json(200, (b[prefix] ?? []).map((f) => ({ name: f.name, updated_at: '2026-01-01T00:00:00Z', metadata: { size: Buffer.from(f.contenu_base64, 'base64').length, mimetype: f.mimetype } })))
      }
      const o = u.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/([^/]+)\/([^/]+)$/)
      if (o && req.method === 'GET') {
        const f = (etat.stockage[decodeURIComponent(o[1])]?.[decodeURIComponent(o[2])] ?? []).find((x) => x.name === decodeURIComponent(o[3]))
        if (f) { res.writeHead(200, { 'Content-Type': f.mimetype }); return res.end(Buffer.from(f.contenu_base64, 'base64')) }
      }
      journal.inattendues.push(`${req.method} ${u.pathname}`)
      return json(404, { message: 'inconnu de la doublure' })
    })
  })
  return new Promise((ok) => serveur.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${serveur.address().port}`, journal, fermer: () => new Promise((f) => serveur.close(f)) })))
}

// Le script tourne dans un processus séparé, dans un dossier jetable, avec un environnement
// réduit : ni .env.local, ni variable du poste ne lui parviennent.
function lancer(script, args, { url, cwd, page = '3' }) {
  return new Promise((ok) => {
    const env = { PATH: process.env.PATH, NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: CLE_FICTIVE, SAUVEGARDE_PAGE: page }
    const p = spawn(process.execPath, [script, ...args], { cwd, env })
    let sortie = ''
    p.stdout.on('data', (d) => { sortie += d })
    p.stderr.on('data', (d) => { sortie += d })
    p.on('close', (code) => ok({ code, sortie }))
  })
}

function dechiffrer(fichier, clePrivee) {
  const brut = fs.readFileSync(fichier)
  const fin = brut.indexOf(0x0a)
  const m = JSON.parse(brut.subarray(0, fin).toString('utf8'))
  const cle = crypto.privateDecrypt({ key: clePrivee, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(m.cle_scellee, 'base64'))
  const d = crypto.createDecipheriv('aes-256-gcm', cle, Buffer.from(m.iv, 'base64'))
  d.setAuthTag(Buffer.from(m.tag, 'base64'))
  return JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(brut.subarray(fin + 1)), d.final()])).toString('utf8'))
}

const archives = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((x) => /\.(presti|json\.gz)$/.test(x)).map((x) => path.join(d, x)) : [])
const memeEnsemble = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
const idDe = (l) => JSON.stringify(l) // la ligne entière : un doublon ou une ligne manquante se voit

// ─── La batterie : jouée sur le vrai script, puis sur chaque mutant ──────────────────────────

async function batterie(script, cles, racine) {
  const r = { ok: 0, ko: [] }
  const T = (nom, cond, detail = '') => { if (cond) { r.ok++; if (BAVARD || script === SCRIPT) console.log(`  ✅ ${nom}`) } else { r.ko.push(nom); if (BAVARD || script === SCRIPT) console.log(`  ❌ ${nom}${detail ? ` — ${String(detail).slice(0, 300)}` : ''}`) } }
  const A = FIXTURE.attendu
  const toutes = Object.keys(FIXTURE.openapi.paths).filter((p) => p !== '/' && !p.startsWith('/rpc/')).map((p) => p.slice(1))
  const dossier = fs.mkdtempSync(path.join(racine, 'essai-'))

  // — Fonctions pures, par import du module (le bloc principal ne s'exécute pas à l'import).
  const mod = await import(`${pathToFileURL(script).href}?n=${crypto.randomBytes(4).toString('hex')}`)
  let refuse = false
  try { mod.controlerExclues({ table_sans_raison: '' }) } catch { refuse = true }
  T('EXCLUES : une table écartée sans raison est refusée', refuse)
  refuse = false
  try { mod.classer([{ nom: 'x', ecriture: true, cle_primaire: [], parents: [] }], { x: 'court' }) } catch { refuse = true }
  T('EXCLUES : une raison trop courte est refusée aussi (classer)', refuse)
  let reellesOk = true
  try { mod.controlerExclues(mod.EXCLUES) } catch { reellesOk = false }
  T('les EXCLUES réelles portent toutes une raison', reellesOk && Object.keys(mod.EXCLUES).length > 0)
  // Graphe indépendant de la fixture, ordre attendu écrit à la main. Rangement par couches :
  // couche 0 = sans parent (a, et e dont la seule clé vise elle-même), puis b, puis c, puis d.
  const g = [{ nom: 'd', parents: ['a', 'c'] }, { nom: 'c', parents: ['b'] }, { nom: 'b', parents: ['a'] }, { nom: 'a', parents: [] }, { nom: 'e', parents: ['e'] }]
  const o = mod.ordreRestauration(g)
  T('ordre de restauration d’un graphe écrit à la main : a, e, b, c, d', JSON.stringify(o.ordre) === JSON.stringify(['a', 'e', 'b', 'c', 'd']) && JSON.stringify(o.auto_references) === '["e"]', JSON.stringify(o))

  // — Sauvegarde complète contre la doublure.
  const etat = clone(FIXTURE)
  const d1 = await doublure(etat)
  const s1 = await lancer(script, ['--dossier', path.join(dossier, 'a'), '--cle-publique', cles.pub, '--fichiers'], { url: d1.url, cwd: dossier })
  const [f1] = archives(path.join(dossier, 'a'))
  T('la sauvegarde passe (code 0) et écrit une archive', s1.code === 0 && !!f1, s1.sortie.slice(-300))
  if (!f1) { await d1.fermer(); return r }
  const m = JSON.parse(fs.readFileSync(f1).subarray(0, fs.readFileSync(f1).indexOf(0x0a)).toString('utf8'))
  const sauvees = Object.keys(m.lignes ?? {})
  const ecartees = m.ecartees ?? {}
  T('toutes les tables attendues sont sauvegardées, et elles seules', memeEnsemble(sauvees, A.sauvegardees), `sauvées : ${sauvees.join(', ')}`)
  const perdues = toutes.filter((t) => !sauvees.includes(t) && !Object.hasOwn(ecartees, t))
  T('aucune relation découverte n’est perdue en silence (sauvegardée ou écartée avec raison)', perdues.length === 0, `perdues : ${perdues.join(', ')}`)
  T('chaque table écartée porte une raison', Object.values(ecartees).every((x) => typeof x === 'string' && x.trim().length >= 12) && A.ecartees.every((t) => Object.hasOwn(ecartees, t)), JSON.stringify(ecartees))
  T('la vue (sans POST) est écartée comme lecture seule', /lecture seule/.test(ecartees.vue_activite ?? ''))
  const comptesFaux = A.sauvegardees.filter((t) => m.lignes?.[t] !== FIXTURE.lignes[t].length)
  T('le compte de chaque table est celui de la doublure', comptesFaux.length === 0, comptesFaux.map((t) => `${t} ${m.lignes?.[t]}≠${FIXTURE.lignes[t].length}`).join(', '))
  const ordre = m.ordre_restauration ?? []
  const viols = A.cles_etrangeres.filter(([enfant, parent]) => !(ordre.indexOf(parent) >= 0 && ordre.indexOf(parent) < ordre.indexOf(enfant)))
  T('l’ordre de restauration met chaque parent avant ses enfants', viols.length === 0 && ordre.length === A.sauvegardees.length, `violées : ${viols.map((v) => v.join('→')).join(', ')} ; ordre : ${ordre.join(', ')}`)
  T('le cycle de clés est signalé et la clé vers soi-même notée', memeEnsemble(m.cycles ?? [], A.cycles) && memeEnsemble(m.auto_references ?? [], A.auto_references), JSON.stringify({ c: m.cycles, a: m.auto_references }))
  T('le manifeste dit les schémas écartés (ops compris) et porte une empreinte par table', !!m.schemas_ecartes?.ops && A.sauvegardees.every((t) => /^[0-9a-f]{64}$/.test(m.empreintes?.[t] ?? '')))
  const nonTriees = d1.journal.requetes.filter((q) => /^\/rest\/v1\/[^/]+$/.test(q.chemin) && !A.sans_cle_primaire.includes(q.chemin.split('/').pop()) && q.chemin !== '/rest/v1/' && !/order=/.test(q.recherche))
  T('chaque page d’une table à clé primaire est triée par cette clé', nonTriees.length === 0, nonTriees.map((q) => q.chemin + q.recherche).join(' '))
  T('la doublure n’a reçu aucune requête inattendue', d1.journal.inattendues.length === 0, d1.journal.inattendues.join(' ; '))

  // — Contenu réel, déchiffré par la suite elle-même (indépendamment de --verifier).
  let contenu = null
  try { contenu = dechiffrer(f1, fs.readFileSync(cles.priv, 'utf8')) } catch (e) { T('l’archive se déchiffre avec la clé privée', false, e.message) }
  if (contenu) {
    const idsFaux = A.sauvegardees.filter((t) => !memeEnsemble((contenu.tables[t] ?? []).map(idDe), FIXTURE.lignes[t].map(idDe)))
    T('chaque table contient exactement les lignes de la doublure (ni doublon ni manque)', idsFaux.length === 0, idsFaux.join(', '))
    T('les tables de l’archive suivent l’ordre de restauration', JSON.stringify(Object.keys(contenu.tables)) === JSON.stringify(ordre))
    T('comptes et fichiers de stockage embarqués', contenu.comptes.length === FIXTURE.comptes.length && Object.keys(contenu.stockage?.fichiers ?? {}).length === 1)
  }

  // — --verifier : complet, structurel, tronquée, falsifiée, vivant.
  const v1 = await lancer(script, ['--verifier', f1, '--cle-privee', cles.priv], { url: d1.url, cwd: dossier })
  T('--verifier avec la clé privée : vert, niveau complet', v1.code === 0 && /niveau complet/.test(v1.sortie), v1.sortie.slice(-300))
  const v2 = await lancer(script, ['--verifier', f1], { url: d1.url, cwd: dossier })
  T('--verifier sans la clé : vert, niveau structurel', v2.code === 0 && /niveau structurel/.test(v2.sortie), v2.sortie.slice(-300))
  const tronquee = path.join(dossier, 'tronquee.presti')
  const brut = fs.readFileSync(f1)
  fs.writeFileSync(tronquee, brut.subarray(0, brut.length - 64))
  const v3 = await lancer(script, ['--verifier', tronquee], { url: d1.url, cwd: dossier })
  T('une archive tronquée échoue à --verifier sans clé', v3.code !== 0, v3.sortie.slice(-200))
  const v4 = await lancer(script, ['--verifier', tronquee, '--cle-privee', cles.priv], { url: d1.url, cwd: dossier })
  T('une archive tronquée échoue à --verifier avec clé', v4.code !== 0, v4.sortie.slice(-200))
  const fin = brut.indexOf(0x0a)
  const mf = JSON.parse(brut.subarray(0, fin).toString('utf8'))
  mf.lignes.leads = mf.lignes.leads - 1
  const falsifiee = path.join(dossier, 'falsifiee.presti')
  fs.writeFileSync(falsifiee, Buffer.concat([Buffer.from(JSON.stringify(mf) + '\n'), brut.subarray(fin + 1)]))
  const v5 = await lancer(script, ['--verifier', falsifiee, '--cle-privee', cles.priv], { url: d1.url, cwd: dossier })
  T('un manifeste dont un compte ment échoue à --verifier (comptes comparés)', v5.code !== 0, v5.sortie.slice(-200))
  const v6 = await lancer(script, ['--verifier', f1, '--vivant'], { url: d1.url, cwd: dossier })
  T('--verifier --vivant : comptes égaux à la base (doublure)', v6.code === 0, v6.sortie.slice(-300))
  etat.lignes.leads.push({ id: 'lead-8', artisan_id: 'art-1', client_id: 'cli-1', message: 'Arrivée après la sauvegarde' })
  const v7 = await lancer(script, ['--verifier', f1, '--vivant'], { url: d1.url, cwd: dossier })
  T('--verifier --vivant voit une table qui a bougé', v7.code !== 0 && /leads/.test(v7.sortie), v7.sortie.slice(-200))
  await d1.fermer()

  // — Une table nouvelle entre sans changer le code.
  const etat2 = clone(FIXTURE)
  etat2.openapi.paths['/nouveautes_qa'] = { get: {}, post: {}, patch: {}, delete: {} }
  etat2.openapi.definitions.nouveautes_qa = { type: 'object', properties: { id: { type: 'string', description: 'Note:\nThis is a Primary Key.<pk/>' }, artisan_id: { type: 'string', description: "Note:\nThis is a Foreign Key to `artisans.id`.<fk table='artisans' column='id'/>" } } }
  etat2.lignes.nouveautes_qa = [{ id: 'nq-1', artisan_id: 'art-1' }, { id: 'nq-2', artisan_id: 'art-2' }]
  const d2 = await doublure(etat2)
  const s2 = await lancer(script, ['--dossier', path.join(dossier, 'b'), '--sans-chiffrer'], { url: d2.url, cwd: dossier })
  await d2.fermer()
  const [f2] = archives(path.join(dossier, 'b'))
  let c2 = null
  try { c2 = JSON.parse(zlib.gunzipSync(fs.readFileSync(f2)).toString('utf8')) } catch { c2 = null }
  T('une table nouvelle entre sans changer le code', s2.code === 0 && c2?.tables?.nouveautes_qa?.length === 2 && c2.manifeste.ordre_restauration.indexOf('nouveautes_qa') > c2.manifeste.ordre_restauration.indexOf('artisans'), s2.sortie.slice(-200))
  const v8 = f2 ? await lancer(script, ['--verifier', f2], { url: d2.url, cwd: dossier }) : { code: 1, sortie: 'pas d’archive' }
  T('--verifier relit l’archive en clair et recompte (niveau complet)', v8.code === 0 && /niveau complet/.test(v8.sortie), v8.sortie.slice(-200))

  // — OpenAPI en panne : refus, et aucune archive partielle.
  const etat3 = clone(FIXTURE)
  etat3.openapiEnPanne = true
  const d3 = await doublure(etat3)
  const s3 = await lancer(script, ['--dossier', path.join(dossier, 'c'), '--cle-publique', cles.pub], { url: d3.url, cwd: dossier })
  await d3.fermer()
  T('OpenAPI en panne : la sauvegarde refuse et n’écrit rien', s3.code !== 0 && archives(path.join(dossier, 'c')).length === 0, s3.sortie.slice(-200))
  return r
}

// ─── Les mutants : chacun doit faire rougir la batterie ──────────────────────────────────────

const MUTANTS = [
  ['liste figée remise', 'const relations = lireOpenApi(r.json)', `const relations = lireOpenApi(r.json).filter((x) => ${JSON.stringify(ANCIENNE_LISTE)}.includes(x.nom))`],
  ['ordre inversé', 'return { ordre, cycles, auto_references, parents_absents }', 'return { ordre: ordre.reverse(), cycles, auto_references, parents_absents }'],
  ['comptes non comparés', "if (attendu !== reel) erreurs.push(`${t} : ${reel} ligne(s) dans l'archive, le manifeste en annonce ${attendu}`)", ''],
  ['raison non exigée', "if (typeof raison !== 'string' || raison.trim().length < RAISON_MIN) throw new Error", 'if (false) throw new Error'],
  ['troncature ignorée', 'if (a.corps.length !== manifeste.octets_compresses) erreurs.push', 'if (false) erreurs.push'],
  ['pagination coupée', 'if (r.json.length < page) break', 'break'],
  ['tri retiré', "const tri = rel.cle_primaire.length ? `&order=${rel.cle_primaire.map((c) => `${encodeURIComponent(c)}.asc`).join(',')}` : ''", "const tri = ''"],
  ['EXCLUES ignorée', 'if (Object.hasOwn(exclues, r.nom)) ecartees[r.nom]', 'if (false) ecartees[r.nom]'],
]

const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'sauvegarde-qa-'))
let code = 0
try {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
  const cles = { pub: path.join(racine, 'jetable.pub.pem'), priv: path.join(racine, 'jetable.key.pem') }
  fs.writeFileSync(cles.pub, publicKey)
  fs.writeFileSync(cles.priv, privateKey)

  console.log('▶ sauvegarde-qa — le vrai script contre la doublure PostgREST (hors ligne)')
  const vrai = await batterie(SCRIPT, cles, racine)
  console.log(`  → ${vrai.ok} vérifiées, ${vrai.ko.length} en échec`)
  if (vrai.ko.length) code = 1

  console.log('\n▶ mutants — chacun doit faire rougir la suite')
  const source = fs.readFileSync(SCRIPT, 'utf8')
  const dossierMutants = fs.mkdtempSync(path.join(racine, 'mutants-'))
  for (const [nom, avant, apres] of MUTANTS) {
    const n = source.split(avant).length - 1
    if (n !== 1) { console.log(`  ❌ mutant « ${nom} » inopérant : le motif apparaît ${n} fois dans sauvegarde.mjs (attendu : 1)`); code = 1; continue }
    const fichier = path.join(dossierMutants, `${nom.replace(/[^a-z]+/gi, '-')}.mjs`)
    fs.writeFileSync(fichier, source.replace(avant, apres))
    const r = await batterie(fichier, cles, racine)
    if (r.ko.length) console.log(`  ✅ mutant « ${nom} » tué — ${r.ko.length} vérification(s) rougissent : ${r.ko.slice(0, 3).join(' · ')}`)
    else { console.log(`  ❌ mutant « ${nom} » SURVIT : la suite ne le voit pas`); code = 1 }
  }
} catch (e) {
  console.log(`❌ la suite elle-même a planté : ${e.stack ?? e.message}`)
  code = 1
} finally {
  fs.rmSync(racine, { recursive: true, force: true })
}
console.log(code ? '\n❌ sauvegarde-qa ROUGE' : '\n✅ sauvegarde-qa VERTE')
process.exit(code)
