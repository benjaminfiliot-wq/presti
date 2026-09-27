// scripts/dossier-zip-qa.mjs — juge du dossier du site rendu à l'artisan (fiche 026-026, lot D ; critères DZ de 026-028),
// écrit par Claude Code AVANT le module qu'il juge. L'exécutant (Codex) qui le lance n'y touche jamais (CLAUDE.md:23).
// Réécrit en entier le 27/09 : la version du 26/09 (Gemini) ne testait que l'existence d'un fichier.
//
//   node --import ./scripts/ts-loader.mjs scripts/dossier-zip-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe <d>/lib/siteDossier.ts, <d>/lib/zip.ts et la route <d>/app/api/site-dossier/[commande]/route.ts
//                 (défaut : le dépôt).
//   --temoin      seulement la non-régression : DZ-3 (NR), la brique de DZ-3 (ZipFlux de lib/zip.ts) sur le faux stockage
//                 du jeu d'essai, ouverte par le lecteur du juge (mêmes fichiers, mêmes octets, CRC justes) ; et DZ-PV.
//   --reel        Claude Code seulement, après le déploiement de 026-028 : DZ-8 contre PRESTI_BASE_URL (défaut
//                 https://prestiapp.fr), secrets lus dans .env.local sans rien afficher, une commande d'essai
//                 essai-026-lt-<horodatage> en @presti-test.invalid et son petit site dans le bucket « sites », ménage dans
//                 un finally (code 1 s'il échoue). Code 2 si 026-021 ou 026-028 n'est pas PASS, ou si une variable manque.
//
// Le module est importé dans un PROCESSUS ENFANT (ce script, --enfant=complet), avec les doublures de
// scripts/fixtures/026-livraison-tresor/d/doublures.mjs à la place de lib/supabaseAdmin (base en mémoire ; stockage en
// mémoire, chargé depuis d/stockage/), lib/limites (en mémoire), lib/email, lib/alertes : aucun réseau (fetch piégé).
//
// Contrats que ce juge fixe pour 026-028 (d/commandes.json, d/stockage/) :
//   deps = { base, stockage, maintenant } : base = la doublure de supabaseAdmin, stockage = son .storage (from(seau) →
//     list/download/upload/remove, comme @supabase/supabase-js), maintenant = () => Date ;
//   creerJetonDossier(id, jours = 90, deps) → le jeton en clair (string) ; verifierJetonDossier(id, jeton, deps) → booléen ;
//   listerSite(id, deps) → les chemins des fichiers (relatifs à <id>/, ou préfixés par <id>/) ;
//   archiveDuSite(id, deps) → un ZipFlux (ou sa promesse) : le juge lit .flux jusqu'au bout ;
//   purgerFichiersExpires(deps) ; servirDossier(req, id, deps) → Response ; la route GET(req, { params: Promise }).
// La liste des entrées de l'archive d'essai (DZ-3) est écrite dans .orchestre/travail/dossier-zip-qa/archive.txt (le juge
// n'écrit que sous .orchestre/travail/ : la fiche 026-028 recopie ce fichier dans ses preuves).
//
// Sortie : une ligne par critère, puis « dossier-zip-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou si un préalable de --reel manque. Un module absent fait échouer DZ-1 avec son chemin ; les critères
// suivants sont alors « non jugés ». Écriture seulement sous .orchestre/travail/dossier-zip-qa/.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, dossierTravail, lancerEnfant, resultatEnfant,
  importer, jugerDans, jugerPreuvesVides, sansCommentaires, typecheck, chargerEnvLocal, marqueEssai, fichePass,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { D_DIR, jeuD, preparerEnfantD, lireZip, lireFlux, RE_EMAIL, RE_PROMESSE, relR } from './fixtures/026-livraison-tresor/d/commun-d.mjs'

const JUGE = 'dossier-zip-qa'
const FICHE = '026-028'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine
const MODULE = 'lib/siteDossier.ts', ROUTE = 'app/api/site-dossier/[commande]/route.ts', ZIP = 'lib/zip.ts'
const EXPORTS = ['creerJetonDossier', 'verifierJetonDossier', 'listerSite', 'archiveDuSite', 'purgerFichiersExpires', 'servirDossier']
const DOUBLES = { 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/limites': 'limites', 'lib/email': 'email', 'lib/alertes': 'alertes', 'lib/flags': 'flags', 'lib/vercelDomains': 'vercelDomains' }
const JOUR = 86_400_000
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')

/** Les fichiers du faux stockage (d/stockage/<id>/…) → { '<id>/<chemin>': { octets, type } }. */
function fauxStockage(ids = null) {
  const racine = path.join(D_DIR, 'stockage'), out = {}
  const rec = (rel) => {
    for (const e of fs.readdirSync(path.join(racine, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) rec(r)
      else if (!ids || ids.some((id) => r.startsWith(`${id}/`))) out[r] = { octets: fs.readFileSync(path.join(racine, r)), type: 'application/octet-stream' }
    }
  }
  rec('')
  return out
}

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'reel-jeton') {
  // --reel seulement : la vraie bibliothèque, la vraie base (adresse et clé passées sous d'autres noms : lancerEnfant force
  // NEXT_PUBLIC_SUPABASE_URL vers un port fermé).
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.REEL_SUPABASE_URL ?? ''
  const id = o.valeurs.commande
  const sd = await importer(RAC, MODULE)
  let jeton = null
  try { jeton = await sd.m.creerJetonDossier(id, 90) } catch { jeton = null }
  resultatEnfant(JUGE, { jeton })
} else if (o.enfant) {
  const J = jeuD('commandes.json')
  const M = new Date(J.maintenant).getTime()
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles: DOUBLES })
  const E = D.etat, X = D.etatD
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {}, archive: '' }
  const C1 = J.dossier.commandes[0].id, C2 = J.dossier.commandes[1].id, C3 = J.dossier.commandes[2].id
  const stock = fauxStockage()
  const attendus = Object.keys(stock).filter((k) => k.startsWith(`${C1}/`)).map((k) => k.slice(C1.length + 1)).sort()
  const ouvrir = async (x, quoi) => {
    const zip = await x
    if (!zip || !zip.flux) throw new Error(`${quoi} ne rend pas un ZipFlux (propriété flux absente : ${court(JSON.stringify(zip), 60)})`)
    return lireZip(await lireFlux(zip.flux))
  }

  if (o.enfant === 'temoin') {
    // DZ-3 (NR) : la brique ZipFlux de lib/zip.ts, avec le lecteur du juge, sur le faux stockage.
    const z = await importer(RAC, ZIP)
    await jugerDans(res, 'DZ-3', async () => {
      if (!z.m || typeof z.m.ZipFlux !== 'function') return { echecs: [`${ZIP} : ZipFlux introuvable (${z.erreur ?? 'export absent'})`] }
      const zip = new z.m.ZipFlux()
      for (const c of attendus) zip.ajouter(c, stock[`${C1}/${c}`].octets)
      zip.ajouter('LISEZ-MOI.txt', 'Témoin du juge : é à ç — texte UTF-8.')
      zip.terminer()
      const lu = lireZip(await lireFlux(zip.flux))
      const e = [...lu.defauts]
      const noms = lu.entrees.map((x) => x.nom).sort()
      const voulus = [...attendus, 'LISEZ-MOI.txt'].sort()
      if (JSON.stringify(noms) !== JSON.stringify(voulus)) e.push(`entrées ${JSON.stringify(noms)}, ${JSON.stringify(voulus)} attendues`)
      for (const x of lu.entrees) {
        const ref = x.nom === 'LISEZ-MOI.txt' ? Buffer.from('Témoin du juge : é à ç — texte UTF-8.') : stock[`${C1}/${x.nom}`]?.octets
        if (ref && x.octets && !ref.equals(x.octets)) e.push(`${x.nom} : contenu différent après décompression`)
      }
      return { echecs: e, detail: `part de non-régression : ZipFlux (${ZIP}) écrit les ${attendus.length} fichiers du faux stockage (d/stockage/, trois niveaux, images binaires) et un texte UTF-8 ; le lecteur du juge (répertoire central, en-têtes locaux, inflateRawSync, CRC-32 recalculé) les rouvre à l'identique` }
    }, suivi)
    resultatEnfant(JUGE, res)
  } else {
    const sd = await importer(RAC, MODULE), rt = await importer(RAC, ROUTE)
    const L = sd.m ?? {}
    const deps = (t = M) => ({ base: D.supabaseAdmin, stockage: D.supabaseAdmin.storage, maintenant: () => new Date(t) })
    const lignes = () => E.tables.sites_commandes ?? []
    const ligne = (id) => lignes().find((l) => l.id === id)
    const initialiser = (commandes, seaux = { sites: stock }) => D.reinitialiserD({ tables: { sites_commandes: structuredClone(commandes) }, seaux })

    await jugerDans(res, 'DZ-1', async () => {
      const e = []
      if (!sd.m) e.push(`${MODULE} ne s'importe pas : ${sd.erreur}`)
      else for (const n of EXPORTS) if (typeof L[n] !== 'function') e.push(`${MODULE} n'exporte pas la fonction ${n}`)
      if (!rt.m) e.push(`${ROUTE} ne s'importe pas : ${rt.erreur}`)
      else if (typeof rt.m.GET !== 'function') e.push(`${ROUTE} n'exporte pas GET`)
      if (e.length) return { echecs: e }
      // La route délègue : params en promesse, bon jeton → 200 application/zip ; mauvais → 404.
      initialiser(J.dossier.commandes)
      const j = await L.creerJetonDossier(C1, 90, deps(Date.now() - JOUR))
      const appel = (jeton) => rt.m.GET(new Request(`https://prestiapp.fr/api/site-dossier/${C1}?j=${encodeURIComponent(jeton)}`, { headers: { 'x-forwarded-for': '192.0.2.11' } }), { params: Promise.resolve({ commande: C1 }) })
      const bon = await appel(j), mauvais = await appel(`${j}x`)
      if (bon?.status !== 200 || !/application\/zip/.test(bon.headers.get('content-type') ?? '')) e.push(`GET de la route (params en promesse, bon jeton) : ${bon?.status} ${bon?.headers?.get?.('content-type')}, 200 application/zip attendu`)
      else { const lu = lireZip(await lireFlux(bon.body)); if (!lu.entrees.some((x) => x.nom === 'index.html')) e.push('GET de la route : archive sans index.html') }
      if (mauvais?.status !== 404) e.push(`GET de la route, mauvais jeton : ${mauvais?.status}, 404 attendu`)
      return { echecs: e, detail: `${MODULE} exporte ${EXPORTS.join(', ')} ; ${ROUTE} exporte GET, qui (params en promesse) sert l'archive au bon jeton et 404 à un mauvais` }
    }, suivi)

    await jugerDans(res, 'DZ-2', async () => {
      const e = []
      if (!['creerJetonDossier', 'verifierJetonDossier'].every((n) => typeof L[n] === 'function')) return { echecs: ['creerJetonDossier ou verifierJetonDossier absente (DZ-1)'] }
      initialiser(J.dossier.commandes)
      const j = await L.creerJetonDossier(C1, 90, deps())
      if (typeof j !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(j)) e.push(`jeton rendu ${court(JSON.stringify(j), 60)} : 32 octets en base64url (43 signes) attendus`)
      const l = ligne(C1)
      if (!l?.dossier_jeton_hash) e.push('dossier_jeton_hash non écrit')
      else {
        if (l.dossier_jeton_hash === j) e.push('le jeton en clair est écrit dans dossier_jeton_hash')
        if (l.dossier_jeton_hash !== sha(String(j))) e.push(`dossier_jeton_hash = ${court(l.dossier_jeton_hash, 70)}, SHA-256 hexadécimal du jeton attendu`)
      }
      const traces = JSON.stringify([E.ecritures, X.requetes, E.emails])
      if (typeof j === 'string' && j.length > 8 && traces.includes(j)) e.push('le jeton en clair apparaît dans une écriture de la base')
      const expire = l?.dossier_expire_le ? new Date(l.dossier_expire_le).getTime() : NaN
      if (!(Math.abs(expire - (M + 90 * JOUR)) <= 60_000)) e.push(`dossier_expire_le = ${l?.dossier_expire_le}, maintenant + 90 j (${new Date(M + 90 * JOUR).toISOString()}) à la minute près attendu`)
      const j30 = await L.creerJetonDossier(C3, 30, deps())
      const e30 = new Date(ligne(C3)?.dossier_expire_le ?? NaN).getTime()
      if (!(Math.abs(e30 - (M + 30 * JOUR)) <= 60_000)) e.push(`jours = 30 : dossier_expire_le = ${ligne(C3)?.dossier_expire_le}, maintenant + 30 j attendu`)
      const jDefaut = await L.creerJetonDossier(C2, undefined, deps())
      const eDef = new Date(ligne(C2)?.dossier_expire_le ?? NaN).getTime()
      if (!(Math.abs(eDef - (M + 90 * JOUR)) <= 60_000)) e.push(`jours par défaut : dossier_expire_le = ${ligne(C2)?.dossier_expire_le}, maintenant + 90 j attendu`)
      if (j30 === j || jDefaut === j) e.push('deux jetons identiques : le jeton doit être aléatoire')
      const v = async (id, jeton, t) => { try { return await L.verifierJetonDossier(id, jeton, deps(t)) } catch (err) { return `lève (${premiereLigne(err)})` } }
      const cas = [
        ['bon jeton, 1 j après', await v(C1, j, M + JOUR), true],
        ['bon jeton, 89 j après', await v(C1, j, M + 89 * JOUR), true],
        ['bon jeton, 91 j après (expiré)', await v(C1, j, M + 91 * JOUR), false],
        ['autre jeton de même forme', await v(C1, crypto.randomBytes(32).toString('base64url'), M + JOUR), false],
        ['jeton d’une autre commande', await v(C1, j30, M + JOUR), false],
        ['jeton vide', await v(C1, '', M + JOUR), false],
        ['empreinte donnée comme jeton', await v(C1, l?.dossier_jeton_hash ?? 'x', M + JOUR), false],
      ]
      for (const [nom, lu, voulu] of cas) if (lu !== voulu) e.push(`verifierJetonDossier, ${nom} : ${lu}, ${voulu} attendu`)
      const src = sansCommentaires(lireRacine(RAC, MODULE) ?? '')
      if (!/\btimingSafeEqual\s*\(/.test(src)) e.push(`${MODULE} n'appelle pas timingSafeEqual (lu dans le source, commentaires exclus)`)
      return { echecs: e, detail: `jeton de 43 signes base64url, aléatoire ; seule son empreinte SHA-256 hexadécimale est écrite, le jeton n'apparaît dans aucune écriture ; expiration à maintenant + 90 j (défaut et explicite), + 30 j sur demande, à la minute près ; accepté à J+1 et J+89, refusé à J+91, refusé pour un autre jeton, celui d'une autre commande, le vide et l'empreinte ; timingSafeEqual lu dans le source` }
    }, suivi)

    let lisezMoi = null
    await jugerDans(res, 'DZ-3', async () => {
      const e = []
      if (!['archiveDuSite', 'listerSite'].every((n) => typeof L[n] === 'function')) return { echecs: ['archiveDuSite ou listerSite absente (DZ-1)'] }
      initialiser(J.dossier.commandes)
      const liste = await L.listerSite(C1, deps())
      const rel = Array.isArray(liste) ? liste.map((x) => String(typeof x === 'object' && x ? x.chemin ?? x.name ?? x.path : x).replace(new RegExp(`^/?${C1}/`), '')).sort() : null
      if (JSON.stringify(rel) !== JSON.stringify(attendus)) e.push(`listerSite : ${court(JSON.stringify(liste), 160)} ; les ${attendus.length} fichiers ${JSON.stringify(attendus)} attendus (dossiers imbriqués compris)`)
      const lu = await ouvrir(L.archiveDuSite(C1, deps()), 'archiveDuSite')
      e.push(...lu.defauts)
      const noms = lu.entrees.map((x) => x.nom)
      const voulus = [...attendus, 'LISEZ-MOI.txt'].sort()
      if (JSON.stringify([...noms].sort()) !== JSON.stringify(voulus)) e.push(`entrées de l'archive ${JSON.stringify(noms)}, exactement ${JSON.stringify(voulus)} attendues`)
      if (new Set(noms).size !== noms.length) e.push('une entrée en double')
      for (const x of lu.entrees) {
        if (x.nom === 'LISEZ-MOI.txt') { lisezMoi = x.octets ? x.octets.toString('utf8') : null; continue }
        const ref = stock[`${C1}/${x.nom}`]
        if (!ref) continue
        if (!x.octets || !ref.octets.equals(x.octets)) e.push(`${x.nom} : ${x.octets?.length ?? '?'} octets décompressés, différents des ${ref.octets.length} du stockage`)
      }
      res.archive = [`# Entrées de l'archive d'essai de ${C1} (faux stockage d/stockage/, lue par dossier-zip-qa)`, ...lu.entrees.map((x) => `${x.nom}\t${x.taille} octets\tcrc ${x.crc.toString(16).padStart(8, '0')}\t${x.crcCalcule === x.crc ? 'crc juste' : 'CRC FAUX'}\t${x.nom === 'LISEZ-MOI.txt' || stock[`${C1}/${x.nom}`]?.octets.equals(x.octets ?? Buffer.alloc(0)) ? 'identique au stockage' : 'DIFFÉRENT'}`)].join('\n') + '\n'
      return { echecs: e, detail: `archive de ${C1} ouverte par le juge (répertoire central, en-têtes locaux, zlib.inflateRawSync) : exactement ${voulus.length} entrées (${voulus.join(', ')}), chemins relatifs et trois niveaux compris, rien de ${C2} ; chaque contenu identique octet pour octet, chaque CRC juste ; listerSite rend les ${attendus.length} fichiers` }
    }, suivi)

    await jugerDans(res, 'DZ-4', async () => {
      const e = []
      if (typeof L.servirDossier !== 'function' || typeof L.creerJetonDossier !== 'function') return { echecs: ['servirDossier ou creerJetonDossier absente (DZ-1)'] }
      initialiser(J.dossier.commandes)
      const j1 = await L.creerJetonDossier(C1, 90, deps()), j3 = await L.creerJetonDossier(C3, 90, deps())
      let ip = 0
      const req = (id, jeton, adresse = `192.0.2.${++ip}`) => new Request(`https://prestiapp.fr/api/site-dossier/${encodeURIComponent(id)}?j=${encodeURIComponent(jeton)}`, { headers: { 'x-forwarded-for': adresse } })
      const servir = async (id, jeton, t = M + JOUR, adresse) => { try { return await L.servirDossier(req(id, jeton, adresse), id, deps(t)) } catch (err) { return { status: `lève (${premiereLigne(err)})`, headers: new Headers(), text: async () => '' } } }
      const ENTETES = { 'content-type': 'application/zip', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' }
      for (const [id, jeton, nom] of [[C1, j1, `site-${J.dossier.commandes[0].domaine}.zip`], [C3, j3, `site-${C3.slice(0, 8)}.zip`]]) {
        const r = await servir(id, jeton)
        if (r.status !== 200) { e.push(`bon jeton de ${id.slice(-4)} : ${r.status}, 200 attendu`); continue }
        for (const [k, v] of Object.entries(ENTETES)) if (r.headers.get(k) !== v) e.push(`bon jeton : ${k} = ${JSON.stringify(r.headers.get(k))}, ${JSON.stringify(v)} attendu`)
        const cd = `attachment; filename="${nom}"`
        if (r.headers.get('content-disposition') !== cd) e.push(`bon jeton : content-disposition = ${JSON.stringify(r.headers.get('content-disposition'))}, ${JSON.stringify(cd)} attendu`)
        const lu = lireZip(await lireFlux(r.body))
        if (lu.defauts.length || !lu.entrees.some((x) => x.nom === 'LISEZ-MOI.txt')) e.push(`bon jeton : archive servie illisible ou sans LISEZ-MOI.txt (${court(lu.defauts.join(' ; '), 80)})`)
      }
      const refus = [
        ['mauvais jeton', await servir(C1, `${j1.slice(0, -2)}zz`)],
        ['jeton expiré (J+91)', await servir(C1, j1, M + 91 * JOUR)],
        ['commande inconnue', await servir(J.dossier.inconnue, j1)],
        ['identifiant non UUID', await servir('pas-un-uuid', j1)],
        ['jeton absent', await servir(C1, '')],
      ]
      const corps = []
      for (const [nom, r] of refus) {
        if (r.status !== 404) e.push(`${nom} : ${r.status}, 404 attendu`)
        corps.push([nom, await r.text()])
      }
      const [n0, c0] = corps[0]
      for (const [nom, c] of corps.slice(1)) if (c !== c0) e.push(`${nom} : corps « ${court(c, 50)} », différent de celui de « ${n0} » (« ${court(c0, 50)} ») : la même 404 octet pour octet attendue`)
      const statuts = []
      for (let i = 1; i <= 11; i++) statuts.push((await servir(C1, `${j1.slice(0, -2)}zz`, M + JOUR, '198.51.100.77')).status)
      if (statuts.slice(0, 10).some((x) => x === 429) || statuts[10] !== 429) e.push(`11 appels dans l'heure d'une même adresse → ${statuts.join(', ')} ; 10 sans 429 puis 429 attendus`)
      const autre = await servir(C1, j1, M + JOUR, '198.51.100.78')
      if (autre.status !== 200) e.push(`une autre adresse, juste après le plafond de la première : ${autre.status}, 200 attendu (plafond par adresse)`)
      return { echecs: e, detail: `bon jeton → 200 avec Content-Type application/zip, Content-Disposition attachment; filename="site-<domaine>.zip" (ou les 8 premiers signes de l'id), Cache-Control private, no-store, X-Robots-Tag noindex, nofollow, archive lisible ; mauvais jeton, expiré, commande inconnue, non-UUID et jeton absent → la même 404, corps identiques octet pour octet ; 11e appel dans l'heure d'une même adresse → 429, une autre adresse passe` }
    }, suivi)

    await jugerDans(res, 'DZ-5', async () => {
      const e = []
      if (typeof L.purgerFichiersExpires !== 'function') return { echecs: ['purgerFichiersExpires absente (DZ-1)'] }
      const P = J.purge.commandes
      const seaux = { sites: {} }
      for (const c of P) for (const f of J.purge.fichiers) seaux.sites[`${c.id}/${f}`] = { octets: Buffer.from(`${c.id} ${f}`), type: 'text/html' }
      initialiser(P, seaux)
      const avant = structuredClone(lignes())
      await L.purgerFichiersExpires(deps())
      const cible = P[0].id
      const restants = (id) => [...(X.seaux.sites ?? new Map()).keys()].filter((k) => k.startsWith(`${id}/`))
      if (restants(cible).length) e.push(`${cible.slice(-4)} (retiree, expirée, non purgée) : fichiers restants ${JSON.stringify(restants(cible))}`)
      const l = ligne(cible)
      if (!l?.fichiers_purges_le) e.push(`${cible.slice(-4)} : fichiers_purges_le non posée`)
      if (l?.email !== `retire-${cible.slice(0, 8)}@anonyme.invalid`) e.push(`${cible.slice(-4)} : adresse ${JSON.stringify(l?.email)}, retire-${cible.slice(0, 8)}@anonyme.invalid attendue`)
      for (const c of P.slice(1)) {
        const x = ligne(c.id), a = avant.find((y) => y.id === c.id)
        if (JSON.stringify(x) !== JSON.stringify(a)) e.push(`${c.id.slice(-4)} (${c.etat}, expire ${c.dossier_expire_le ?? 'jamais'}, purgée ${c.fichiers_purges_le ? 'oui' : 'non'}) modifiée : ${court(JSON.stringify(x), 90)}`)
        if (restants(c.id).length !== J.purge.fichiers.length) e.push(`${c.id.slice(-4)} : ${J.purge.fichiers.length - restants(c.id).length} fichier(s) effacé(s) à tort`)
      }
      const apres1 = JSON.stringify(lignes())
      const nEcr = X.requetes.filter((q) => q.genre !== 'select').length, nRm = X.stockage.filter((s) => s.op === 'remove').length
      await L.purgerFichiersExpires(deps(M + JOUR))
      const nEcr2 = X.requetes.filter((q) => q.genre !== 'select').length - nEcr, nRm2 = X.stockage.filter((s) => s.op === 'remove').length - nRm
      if (JSON.stringify(lignes()) !== apres1 || nEcr2 > 0 || nRm2 > 0) e.push(`second passage : ${nEcr2} écriture(s), ${nRm2} effacement(s) de fichiers ; rien attendu`)
      return { echecs: e, detail: `sur 5 commandes, seule la retiree expirée non purgée perd ses ${J.purge.fichiers.length} fichiers (sous-dossiers compris), reçoit fichiers_purges_le et retire-${cible.slice(0, 8)}@anonyme.invalid ; déjà purgée, pas encore expirée, en ligne expirée et sans expiration : intactes, fichiers compris ; un second passage n'écrit rien et n'efface rien` }
    }, suivi)

    await jugerDans(res, 'DZ-6', () => {
      const e = []
      if (lisezMoi === null) return { echecs: ['LISEZ-MOI.txt absent de l’archive (DZ-3)'] }
      if (!/statique/i.test(lisezMoi) || !/h[ée]berg/i.test(lisezMoi)) e.push('LISEZ-MOI.txt ne dit pas que le site est statique et s’héberge tel quel')
      if (!/formulaire/i.test(lisezMoi)) e.push('LISEZ-MOI.txt ne parle pas du formulaire')
      if (!/domaine/i.test(lisezMoi)) e.push('LISEZ-MOI.txt ne parle pas du domaine')
      const p = RE_PROMESSE.exec(lisezMoi); if (p) e.push(`LISEZ-MOI.txt promet : « ${p[0]} »`)
      const m = RE_EMAIL.exec(lisezMoi); if (m) e.push(`LISEZ-MOI.txt contient une adresse e-mail (${m[0]})`)
      return { echecs: e, detail: `LISEZ-MOI.txt (${lisezMoi.length} signes) : site statique hébergeable tel quel, formulaire, domaine ; ni garantie, ni classement, ni première page, aucune adresse e-mail` }
    }, suivi)
    resultatEnfant(JUGE, res)
  }
} else {
// ═══ Le processus principal ═════════════════════════════════════════════════════════════════════════════════════════════
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ensemble')
if (!fs.existsSync(RAC)) refuserAppel(JUGE, `racine introuvable : ${RAC}`)
const IDS = o.temoin ? ['DZ-3', 'DZ-PV'] : ['DZ-1', 'DZ-2', 'DZ-3', 'DZ-4', 'DZ-5', 'DZ-6', 'DZ-7', ...(o.reel ? ['DZ-8'] : []), 'DZ-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${relR(RAC)}, mode ${o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'}`, { nr: o.temoin ? ['DZ-3'] : [] })
const ENFANTS = ['DZ-1', 'DZ-2', 'DZ-3', 'DZ-4', 'DZ-5', 'DZ-6']

let suite = true
if (o.temoin) {
  const r = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'temoin', timeout: 120_000 })
  const c = r.res?.criteres?.['DZ-3']
  if (c) s.juger('DZ-3', c.echecs, c.detail); else s.echoue('DZ-3', `l'enfant n'a rien rendu (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) — ${court(r.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 200)}`)
} else if (!fs.existsSync(path.join(RAC, MODULE))) {
  s.echoue('DZ-1', `${MODULE} absent : le module de la fiche ${FICHE} n'existe pas (encore)`)
  s.nonJuges(IDS.filter((x) => x !== 'DZ-1' && x !== 'DZ-PV'), `${MODULE} absent (DZ-1)`)
  suite = false
} else {
  const r = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 180_000 })
  if (!r.res) {
    s.echoue('DZ-1', `l'enfant qui importe ${MODULE} n'a rien rendu (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) — ${court(r.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 240)}`)
    s.nonJuges(ENFANTS.slice(1), 'enfant sans résultat (DZ-1)')
  } else {
    if (r.res.archive) {
      const d = dossierTravail(JUGE, 'archive')
      fs.writeFileSync(path.join(d, 'archive.txt'), r.res.archive)
      if (r.res.criteres['DZ-3']) r.res.criteres['DZ-3'].detail += ` ; liste écrite dans ${relR(path.join(d, 'archive.txt'))}`
    }
    for (const id of ENFANTS) { const c = r.res.criteres[id]; if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, 'non rendu par l’enfant') }
  }
}

// ── DZ-7 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (!o.temoin && suite) await s.critere('DZ-7', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })

// ── DZ-8 (--reel) ────────────────────────────────────────────────────────────────────────────────────────────────────────
let codeMenage = 0
if (o.reel && suite) {
  for (const f of ['026-021', FICHE]) if (!fichePass(f)) { s.echoue('DZ-8', `préalable absent : la fiche ${f} n'est pas PASS`); s.finir(); process.exit(2) }
  chargerEnvLocal()
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
  const APP = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
  if (!SB || !SVC) { s.echoue('DZ-8', 'préalable absent : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manque (.env.local)'); s.finir(); process.exit(2) }
  const marque = marqueEssai()
  const h = { apikey: SVC, Authorization: `Bearer ${SVC}` }
  const rest = (chemin, init = {}) => fetch(`${SB}/rest/v1/${chemin}`, { ...init, headers: { ...h, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) })
  const objet = (chemin, init = {}) => fetch(`${SB}/storage/v1/object/sites/${chemin}`, { ...init, headers: { ...h, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) })
  const e = []
  let id = null
  try {
    const ins = await rest('sites_commandes?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ email: `${marque}@presti-test.invalid`, etat: 'en_ligne', metier: 'Essai', entreprise: marque, domaine_mode: 'aucun', paye_le: new Date().toISOString() }) })
    if (ins.status !== 201) throw new Error(`insertion de la commande d'essai : ${ins.status} ${court(await ins.text(), 120)}`)
    id = (await ins.json())[0].id
    for (const [f, t] of [['index.html', `<!doctype html><title>${marque}</title>`], ['pages/a.html', '<p>a</p>']]) {
      const u = await objet(`${id}/${f}`, { method: 'POST', headers: { 'Content-Type': 'text/html; charset=utf-8', 'x-upsert': 'true' }, body: t })
      if (!u.ok) throw new Error(`dépôt de ${f} : ${u.status}`)
    }
    // Le jeton est créé par la bibliothèque elle-même (processus enfant, vraie base : --reel seulement).
    const x = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'reel-jeton', args: [`--commande=${id}`], env: { REEL_SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: SVC }, timeout: 60_000 })
    const jeton = x.res?.jeton
    if (!jeton) throw new Error(`jeton non créé par creerJetonDossier (code ${x.code})`)
    const bon = await fetch(`${APP}/api/site-dossier/${id}?j=${encodeURIComponent(jeton)}`, { signal: AbortSignal.timeout(60_000) })
    if (bon.status !== 200) e.push(`bon jeton → ${bon.status}, 200 attendu`)
    else { const lu = lireZip(Buffer.from(await bon.arrayBuffer())); if (lu.defauts.length || !lu.entrees.some((y) => y.nom === 'index.html')) e.push(`archive servie : ${court(lu.defauts.join(' ; ') || 'sans index.html', 120)}`) }
    const mauvais = await fetch(`${APP}/api/site-dossier/${id}?j=${encodeURIComponent(`${jeton}x`)}`, { signal: AbortSignal.timeout(30_000) })
    if (mauvais.status !== 404) e.push(`mauvais jeton → ${mauvais.status}, 404 attendu`)
  } catch (err) { e.push(`--reel interrompu : ${premiereLigne(err)}`) } finally {
    try {
      if (id) {
        await fetch(`${SB}/storage/v1/object/sites`, { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [`${id}/index.html`, `${id}/pages/a.html`] }), signal: AbortSignal.timeout(20_000) })
        await rest(`sites_commandes?id=eq.${id}`, { method: 'DELETE' })
        const reste = await (await rest(`sites_commandes?select=id&id=eq.${id}`)).json().catch(() => null)
        if (!Array.isArray(reste) || reste.length) { e.push('ménage incomplet : la commande d’essai reste'); codeMenage = 1 }
      }
    } catch (err) { e.push(`ménage interrompu : ${premiereLigne(err)}`); codeMenage = 1 }
  }
  s.juger('DZ-8', e, `${APP}/api/site-dossier/<id> : bon jeton (créé par creerJetonDossier) → 200 et une archive valide avec index.html ; mauvais jeton → 404 ; ménage du bucket et de la commande fait (${marque})`)
}

jugerPreuvesVides(s, 'DZ', RAC, FICHE)
process.exit(codeMenage || s.finir())
}
