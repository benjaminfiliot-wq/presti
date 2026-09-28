#!/usr/bin/env node
// scripts/pack-pub-dossier-qa.mjs — le juge du dossier du pack pubs (fiches 026-135 « api » et 026-144 « page »), écrit
// par Claude Code AVANT ce qu'il juge (fiche 026-110, « Ce qu'il faut faire », point 1). Contrat : scripts/fixtures/
// 026-pubs-contenu/contrat-pack.json ; jeux d'essai : scripts/fixtures/026-pubs-contenu/dossier/entrees/*.json.
//
// --partie=api (PD-1 à PD-4) : `nettoyerDossierPack` de lib/packPubDossier.ts est APPELÉE pour de vrai, dans un
// processus à part (node --experimental-strip-types --import ./scripts/ts-loader.mjs, cwd = racine), une fois par
// fixture de dossier/entrees/ — jamais une lecture de son texte. app/api/pubs/commander/brouillon/route.ts (PD-2) et
// la compatibilité Next 16 (PD-3) : lecture statique. --partie=page (PD-5 à PD-8) : lecture statique de app/pubs/
// commander/page.tsx, app/pubs/CartePackPub.tsx et du diff de app/dashboard/page.tsx.
//
// Le contrat de nettoyerDossierPack(entree, contexte), fixé ici pour fiche 07 (026-135) :
//   contexte = { uid, urlSupabase, photosDuSite: string[], decennaleDeclaree: boolean }
//   rend { ok: true, dossier: DossierPackNettoye } ou { ok: false, erreur: string } (erreur nomme le champ en cause).
//
// Critères api : PD-1 nettoyerDossierPack (fonctions pures) · PD-2 la route /api/pubs/commander/brouillon · PD-3
// compatible Next 16 · PD-4 npm run typecheck · PD-9 non-régression (ajouté par 026-110, point 4 : app/api/media/
// route.ts et lib/siteCommande.ts inchangés — les modèles du chemin de photo et de sites_commandes.matiere.photos).
// Critères page : PD-5 app/pubs/commander/page.tsx · PD-6 libellés exigés · PD-7 CartePackPub.tsx et le dashboard ·
// PD-8 npm run typecheck.
//
// Usage :
//   node scripts/pack-pub-dossier-qa.mjs --partie=api|page [--racine=<dossier>]
//   node scripts/pack-pub-dossier-qa.mjs --partie=api|page --temoin   PD-9 seul (non-régression, partie=api ;
//                                                                      page : rien à prouver tant que rien n'est construit)
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide. N'écrit que sous .orchestre/travail/pack-pub-dossier-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, lireOptionsOuQuitter, git, lancer } from './fixtures/025/commun.mjs'
import { creerRapport, dossierTravail, court, lf } from './lib/sql-essai.mjs'
import { CONTRAT } from './fixtures/026-pubs-contenu/commun.mjs'

const NOM = 'pack-pub-dossier-qa'
const TS_LOADER = path.join(R, 'scripts', 'ts-loader.mjs')
const FICHE = { api: '026-135', page: '026-144' }
const IDS = { api: ['PD-1', 'PD-2', 'PD-3', 'PD-4', 'PD-9'], page: ['PD-5', 'PD-6', 'PD-7', 'PD-8'] }
const MAT = CONTRAT.matiere

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['partie'] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
const PARTIE = o.valeur('partie')
if (!['api', 'page'].includes(PARTIE)) refuser(`--partie=api|page attendu (reçu : ${PARTIE ?? 'rien'})`)
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }

// ── Un extracteur de bloc { … } conscient des chaînes, gabarits et commentaires JS/TS (repris de pack-pub-paiement-qa.mjs) ──
function extraireAccolades(texte, iOuverte) {
  let i = iOuverte, prof = 0
  const n = texte.length
  while (i < n) {
    const c = texte[i]
    if (c === '/' && texte[i + 1] === '/') { const nl = texte.indexOf('\n', i); i = nl < 0 ? n : nl; continue }
    if (c === '/' && texte[i + 1] === '*') { const e = texte.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue }
    if (c === "'" || c === '"') { const q = c; i++; while (i < n && texte[i] !== q) { i += texte[i] === '\\' ? 2 : 1 }; i++; continue }
    if (c === '`') { i++; while (i < n && texte[i] !== '`') { if (texte[i] === '\\') i += 2; else if (texte[i] === '$' && texte[i + 1] === '{') { i += 2; let d = 1; while (i < n && d) { if (texte[i] === '{') d++; else if (texte[i] === '}') d--; i++ } } else i++ }; i++; continue }
    if (c === '{') { prof++; i++; continue }
    if (c === '}') { prof--; i++; if (prof === 0) return texte.slice(iOuverte, i); continue }
    i++
  }
  return null
}
/** Le corps de `export [async ]function <nom>(…) { … }`, accolades comprises, ou null. */
function extraireFonction(texte, nom) {
  const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${nom}\\b[\\s\\S]*?\\{`)
  const m = re.exec(texte)
  if (!m) return null
  return extraireAccolades(texte, m.index + m[0].length - 1)
}

// ── PD-1 : la sonde (--partie=api) : un processus à part, cwd = racine, qui IMPORTE et APPELLE nettoyerDossierPack ──
const DOSSIER_ENTREES = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'dossier', 'entrees')
const UID = '11111111-1111-4111-8111-111111111111'
const URL_SB = 'https://exemple-projet.supabase.co'
const PHOTO_SITE = `${URL_SB}/storage/v1/object/public/site-genere/site-abc12345/photo-facade.jpg`
const CONTEXTE_BASE = { uid: UID, urlSupabase: URL_SB, photosDuSite: [PHOTO_SITE], decennaleDeclaree: true }

function lireFixturesDossier() {
  const noms = fs.readdirSync(DOSSIER_ENTREES).filter((f) => f.endsWith('.json')).sort()
  if (!noms.length) throw new Error(`${aff(path.relative(R, DOSSIER_ENTREES))} : aucun fichier .json`)
  return noms.map((f) => {
    const j = JSON.parse(fs.readFileSync(path.join(DOSSIER_ENTREES, f), 'utf8'))
    if (!j || typeof j !== 'object' || !('entree' in j)) throw new Error(`${f} : { entree, champ } attendu`)
    return { nom: f.replace(/\.json$/, ''), entree: j.entree, champ: j.champ ?? null, contexte: { ...CONTEXTE_BASE, ...(j.contexte_supplement || {}) }, coercion: j.coercion || null, champInconnu: j.champ_inconnu || null, troncature: !!j.troncature }
  })
}
function construireSondePD1(fixtures) {
  const appels = fixtures.map((x) => ({ nom: x.nom, entree: x.entree, contexte: x.contexte }))
  return `// Sonde de ${NOM} --partie=api (PD-1), écrite par le juge (fiche 026-110). Importe et APPELLE le code jugé, cwd = racine.
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const R = ${JSON.stringify(racine)}
async function importer(rel) { try { return { m: await import(pathToFileURL(path.join(R, rel)).href) } } catch (e) { return { erreur: String((e && e.stack) || e) } } }
const dossier = await importer('lib/packPubDossier.ts')
const out = { erreur: null, resultats: [] }
if (dossier.erreur) out.erreur = dossier.erreur
const PD = dossier.m || {}
for (const a of ${JSON.stringify(appels)}) {
  try {
    const r = typeof PD.nettoyerDossierPack === 'function' ? PD.nettoyerDossierPack(a.entree, a.contexte) : '(absente)'
    out.resultats.push({ nom: a.nom, rendu: r })
  } catch (e) { out.resultats.push({ nom: a.nom, exception: String((e && e.message) || e) }) }
}
console.log('SONDE_PD_JSON ' + JSON.stringify(out))
`
}
function lancerSondePD1(fixtures) {
  const fichier = path.join(dossierTravail(NOM), 'sonde-pd1.mjs')
  fs.writeFileSync(fichier, construireSondePD1(fixtures))
  const r = lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, fichier], { cwd: racine, timeout: 60_000, env: {} })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('SONDE_PD_JSON '))
  if (!ligne) return { erreur: `la sonde n'a rendu aucun résultat (code ${r.code}${r.signal ? ` signal ${r.signal}` : ''}) : ${court(r.sortie, 300)}` }
  try { return { r: JSON.parse(ligne.slice('SONDE_PD_JSON '.length)) } } catch { return { erreur: 'résultat de la sonde illisible (JSON invalide)' } }
}
function jugerPD1(s) {
  const fixtures = lireFixturesDossier()
  const sonde = lancerSondePD1(fixtures)
  if (sonde.erreur) { s.echoue('PD-1', `sonde en échec : ${sonde.erreur}`); return }
  const { r } = sonde
  if (r.erreur) { s.echoue('PD-1', `lib/packPubDossier.ts ne s'importe pas : ${court(r.erreur, 200)}`); return }
  for (const f of fixtures) {
    const x = r.resultats.find((y) => y.nom === f.nom)
    if (!x) { s.echoue('PD-1', `${f.nom} : aucun résultat rendu par la sonde`); continue }
    if (x.exception) { s.echoue('PD-1', `${f.nom} : nettoyerDossierPack a levé : ${court(x.exception, 140)}`); continue }
    if (x.rendu === '(absente)') { s.echoue('PD-1', 'nettoyerDossierPack absente de lib/packPubDossier.ts'); continue }
    const rendu = x.rendu
    if (!rendu || typeof rendu !== 'object' || typeof rendu.ok !== 'boolean') { s.echoue('PD-1', `${f.nom} : rendu ${court(JSON.stringify(rendu), 100)} ({ ok, … } attendu)`); continue }
    if (f.champ !== null) {
      if (rendu.ok !== false) { s.echoue('PD-1', `${f.nom} accepté à tort (champ ${f.champ} attendu en refus)`); continue }
      if (typeof rendu.erreur !== 'string' || !rendu.erreur.toLowerCase().includes(f.champ.toLowerCase())) s.echoue('PD-1', `${f.nom} : erreur « ${court(rendu.erreur, 100)} » ne nomme pas ${f.champ}`)
      continue
    }
    if (rendu.ok !== true || !rendu.dossier || typeof rendu.dossier !== 'object') { s.echoue('PD-1', `${f.nom} refusé à tort : ${court(rendu.erreur, 140)}`); continue }
    const d = rendu.dossier
    if (f.coercion === 'decennale_false') { if (d.decennale !== false) s.echoue('PD-1', `${f.nom} : decennale = ${JSON.stringify(d.decennale)}, false attendu (decennaleDeclaree=false)`) }
    else if (f.champInconnu) { if (f.champInconnu in d) s.echoue('PD-1', `${f.nom} : le champ inconnu ${f.champInconnu} n'a pas été retiré`) }
    else if (f.troncature) {
      const fa = d.faits || {}
      if (!(String(fa.metier || '').length <= MAT.faits.metier_max)) s.echoue('PD-1', `${f.nom} : faits.metier non borné à ${MAT.faits.metier_max} (${String(fa.metier || '').length})`)
      if (!(String(fa.ville || '').length <= MAT.faits.ville_max)) s.echoue('PD-1', `${f.nom} : faits.ville non borné à ${MAT.faits.ville_max} (${String(fa.ville || '').length})`)
      if (!(Array.isArray(fa.communes) && fa.communes.length <= MAT.faits.communes_max)) s.echoue('PD-1', `${f.nom} : faits.communes non borné à ${MAT.faits.communes_max} (${Array.isArray(fa.communes) ? fa.communes.length : '?'})`)
      if (!(String(fa.duree_travaux || '').length <= MAT.faits.duree_travaux_max)) s.echoue('PD-1', `${f.nom} : faits.duree_travaux non borné à ${MAT.faits.duree_travaux_max}`)
      if (!(String(fa.materiaux || '').length <= MAT.faits.materiaux_max)) s.echoue('PD-1', `${f.nom} : faits.materiaux non borné à ${MAT.faits.materiaux_max}`)
    } else {
      if (!Array.isArray(d.photos) || d.photos.length !== f.entree.photos.length) s.echoue('PD-1', `${f.nom} : ${Array.isArray(d.photos) ? d.photos.length : '?'} photo(s) rendue(s), ${f.entree.photos.length} attendue(s)`)
    }
  }
  if (!s.enEchec('PD-1')) s.passe('PD-1', `nettoyerDossierPack : ${fixtures.length} jeux d'essai (${fixtures.filter((f) => f.champ).length} refus nommés, valide accepté avec une photo de photosDuSite, décennale forcée à false, champ inconnu retiré, textes bornés)`)
}

// ── PD-2 : la route /api/pubs/commander/brouillon (statique) ────────────────────────────────────────────────────
function jugerPD2(s) {
  const fichier = 'app/api/pubs/commander/brouillon/route.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('PD-2', `${fichier} absent ou vide`); return }
  const RE_404 = /^\{\s*(?:\/\/[^\n]*\n\s*)*if\s*\(\s*!\s*actif\(\s*['"]packPub['"]\s*\)\s*\)/
  const get = extraireFonction(texte, 'GET')
  const put = extraireFonction(texte, 'PUT')
  if (!get) s.echoue('PD-2', 'export async function GET introuvable')
  else {
    if (!RE_404.test(get)) s.echoue('PD-2', "la première instruction du GET n'est pas « if (!actif('packPub')) … »")
    if (!/authArtisan\(/.test(get)) s.echoue('PD-2', 'authArtisan( absent du GET')
    const occ = [...get.matchAll(/artisan_id/g)].length
    if (occ < 2) s.echoue('PD-2', `GET : « artisan_id » trouvé ${occ} fois, au moins 2 attendues (brouillon + photos de la dernière commande de site)`)
    if (!/packs_pubs/.test(get)) s.echoue('PD-2', 'GET : packs_pubs absent (le brouillon)')
    if (!/sites_commandes/.test(get)) s.echoue('PD-2', 'GET : sites_commandes absent (les photos de la dernière commande de site)')
  }
  if (!put) s.echoue('PD-2', 'export async function PUT introuvable')
  else {
    if (!RE_404.test(put)) s.echoue('PD-2', "la première instruction du PUT n'est pas « if (!actif('packPub')) … »")
    if (!/authArtisan\(/.test(put)) s.echoue('PD-2', 'authArtisan( absent du PUT')
    const iNet = put.indexOf('nettoyerDossierPack(')
    const iEnr = put.indexOf('enregistrerBrouillonPack(')
    if (iNet < 0) s.echoue('PD-2', 'PUT : nettoyerDossierPack( absent')
    if (iEnr < 0) s.echoue('PD-2', 'PUT : enregistrerBrouillonPack( absent')
    if (iNet >= 0 && iEnr >= 0 && iEnr <= iNet) s.echoue('PD-2', 'PUT : enregistrerBrouillonPack appelé avant nettoyerDossierPack')
    if (/\.from\(\s*['"]packs_pubs['"]\s*\)/.test(put)) s.echoue('PD-2', "PUT : .from('packs_pubs') appelé directement — doit passer par enregistrerBrouillonPack")
  }
  if (!s.enEchec('PD-2')) s.passe('PD-2', "GET et PUT : 404 (drapeau packPub) en tête, authArtisan ; PUT → nettoyerDossierPack puis enregistrerBrouillonPack, aucun .from('packs_pubs') direct ; GET filtre sur artisan_id (brouillon + photos du site)")
}

// ── PD-3 : compatibilité Next 16 (statique) ─────────────────────────────────────────────────────────────────────
function jugerPD3(s) {
  const fichier = 'app/api/pubs/commander/brouillon/route.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('PD-3', `${fichier} absent ou vide`); return }
  // La route n'a pas de segment dynamique ([id]) : si elle lit quand même `ctx.params` ou `params`, ce doit être await.
  if (/\bparams\b/.test(texte) && !/await\s+(?:ctx\.)?params\b/.test(texte)) s.echoue('PD-3', 'params lu sans await (Next 16 : ctx.params est une promesse)')
  const mAvant = git(['show', 'HEAD:middleware.ts'])
  const nouveauMiddleware = mAvant.code !== 0 && fs.existsSync(ch('middleware.ts'))
  if (nouveauMiddleware) s.echoue('PD-3', 'middleware.ts est un nouveau fichier — aucun nouveau middleware attendu (fiche 026-004 : proxy.ts)')
  if (!s.enEchec('PD-3')) s.passe('PD-3', 'aucun accès synchrone à params, aucun nouveau middleware.ts')
}

// ── PD-4, PD-8 : npm run typecheck ──────────────────────────────────────────────────────────────────────────────
function jugerTypecheck(s, id) {
  const r = lancer('npm', ['run', 'typecheck'], { cwd: racine, timeout: 300_000, shell: process.platform === 'win32' })
  if (r.code !== 0) s.echoue(id, `npm run typecheck en code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''} : ${court(r.derniereLigne || r.sortie, 200)}`)
  else s.passe(id, 'npm run typecheck vert')
}

// ── PD-9 : non-régression (ajouté par 026-110, point 4) ─────────────────────────────────────────────────────────
const FICHIERS_MODELES = ['app/api/media/route.ts', 'lib/siteCommande.ts']
function jugerPD9(s) {
  const echecs = []
  for (const f of FICHIERS_MODELES) {
    const head = git(['show', `HEAD:${f}`])
    if (head.code !== 0) { echecs.push(`${f} introuvable dans HEAD`); continue }
    const ici = lireSi(ch(f))
    if (ici === null) { echecs.push(`${f} absent (racine ${aff(racine)})`); continue }
    if (lf(head.stdout) !== ici) echecs.push(`${f} modifié par rapport à HEAD`)
  }
  if (echecs.length) for (const e of echecs) s.echoue('PD-9', e)
  else s.passe('PD-9', `${FICHIERS_MODELES.length} fichiers modèles identiques à HEAD (chemin des photos, sites_commandes.matiere.photos)`)
}

// ── PD-5, PD-6, PD-7 (--partie=page) ────────────────────────────────────────────────────────────────────────────
function jugerPD5(s) {
  const fichier = 'app/pubs/commander/page.tsx'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('PD-5', `${fichier} absent ou vide`); return }
  if (!/['"`]\/api\/pubs\/commander\/brouillon['"`]/.test(texte)) s.echoue('PD-5', "aucun appel à '/api/pubs/commander/brouillon' (lecture/écriture du brouillon)")
  if (!/['"`]\/api\/pubs\/commander['"`]/.test(texte)) s.echoue('PD-5', "aucun appel à '/api/pubs/commander' (paiement)")
  if (!/uploadArtisanMedia\(/.test(texte)) s.echoue('PD-5', 'uploadArtisanMedia( absent (envoi des nouvelles photos)')
  if (!/import\s*\{[^}]*\bPRIX_PACK_PUB_TEXTE\b[^}]*\}\s*from\s*['"]\S*lib\/packPub['"]/.test(texte)) s.echoue('PD-5', "PRIX_PACK_PUB_TEXTE n'est pas importé de lib/packPub")
  if (!/import\s*\{[^}]*\bACCROCHES_PACK\b[^}]*\}\s*from\s*['"]\S*lib\/packPub['"]/.test(texte)) s.echoue('PD-5', "ACCROCHES_PACK n'est pas importé de lib/packPub")
  if (/\b149\b/.test(texte)) s.echoue('PD-5', "« 149 » écrit en dur : le prix doit venir de PRIX_PACK_PUB_TEXTE")
  if (!s.enEchec('PD-5')) s.passe('PD-5', 'lit/écrit le brouillon, paie, envoie les photos par uploadArtisanMedia, importe PRIX_PACK_PUB_TEXTE et ACCROCHES_PACK, aucun « 149 » en dur')
}
const LIBELLES_EXIGES = ['Des personnes sont visibles sur cette photo', 'Elles ont donné leur accord', 'Voix générée par IA', 'TVA non applicable, art. 293 B du CGI', 'Je détiens les droits sur ces photos']
function jugerPD6(s) {
  const fichier = 'app/pubs/commander/page.tsx'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('PD-6', `${fichier} absent ou vide`); return }
  const manquants = LIBELLES_EXIGES.filter((l) => !texte.includes(l))
  if (manquants.length) { s.echoue('PD-6', `libellé(s) absent(s) : ${manquants.map((l) => `« ${l} »`).join(' ; ')}`); return }
  const iPersonnes = texte.indexOf('Des personnes sont visibles sur cette photo')
  const iAccord = texte.indexOf('Elles ont donné leur accord')
  if (iAccord <= iPersonnes) s.echoue('PD-6', "« Elles ont donné leur accord » doit venir après la case « personnes visibles »")
  const avantAccord = texte.slice(Math.max(0, iAccord - 400), iAccord)
  if (!/\{[^{}]*(?:personne|Personne)[^{}]*&&/.test(avantAccord) && !/\{[^{}]*(?:personne|Personne)[^{}]*\?/.test(avantAccord)) {
    s.echoue('PD-6', "la case « accord » ne semble pas conditionnée par la case « personnes » (aucun rendu conditionnel trouvé à proximité)")
  }
  if (!s.enEchec('PD-6')) s.passe('PD-6', `${LIBELLES_EXIGES.length} libellés exigés présents ; « accord » conditionné par « personnes »`)
}
function jugerPD7(s) {
  const carte = lireSi(ch('app/pubs/CartePackPub.tsx'))
  if (carte === null) { s.echoue('PD-7', 'app/pubs/CartePackPub.tsx absent ou vide'); return }
  const fichier = 'app/dashboard/page.tsx'
  const ici = lireSi(ch(fichier))
  const head = git(['show', `HEAD:${fichier}`])
  if (head.code !== 0) { s.echoue('PD-7', `${fichier} introuvable dans HEAD`); return }
  if (ici === null) { s.echoue('PD-7', `${fichier} absent (racine ${aff(racine)})`); return }
  const d = git(['diff', '--unified=0', 'HEAD', '--', fichier], { cwd: racine })
  const lignes = d.stdout.split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
  const ajoutees = lignes.filter((l) => l.startsWith('+')).map((l) => l.slice(1))
  const retirees = lignes.filter((l) => l.startsWith('-'))
  if (retirees.length) s.echoue('PD-7', `${retirees.length} ligne(s) retirée(s) du dashboard : le diff ne doit qu'ajouter`)
  const imports = ajoutees.filter((l) => /CartePackPub/.test(l) && /^\s*import\b/.test(l))
  const rendus = ajoutees.filter((l) => /actif\(\s*['"]packPubVente['"]\s*\)/.test(l))
  if (imports.length !== 1) s.echoue('PD-7', `${imports.length} ligne(s) d'import de CartePackPub ajoutée(s), une seule attendue`)
  const autres = ajoutees.filter((l) => !imports.includes(l) && !rendus.includes(l))
  if (rendus.length !== 1) s.echoue('PD-7', `${rendus.length} ligne(s) rendue(s) sous actif('packPubVente'), une seule attendue`)
  if (autres.length) s.echoue('PD-7', `${autres.length} ligne(s) ajoutée(s) hors de l'import et de la ligne rendue : ${court(autres[0], 80)}`)
  if (!s.enEchec('PD-7')) s.passe('PD-7', "CartePackPub.tsx présent ; le dashboard ne change que par son import et une ligne rendue sous actif('packPubVente')")
}

// ── Le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────
function juger() {
  const s = creerRapport(NOM, IDS[PARTIE], { entete: `${NOM} --partie=${PARTIE} (${FICHE[PARTIE]}) — racine ${aff(racine)}${o.temoin ? ' — témoin' : ''}` })
  if (o.temoin) {
    for (const id of IDS[PARTIE]) if (id !== 'PD-9') s.saute(id, `témoin : critère de fabrication, prouvé par le PASS de ${FICHE[PARTIE]}`)
    if (IDS[PARTIE].includes('PD-9')) jugerPD9(s)
    return s.fin()
  }
  if (PARTIE === 'api') {
    jugerPD1(s)
    jugerPD2(s)
    jugerPD3(s)
    jugerTypecheck(s, 'PD-4')
    jugerPD9(s)
  } else {
    jugerPD5(s)
    jugerPD6(s)
    jugerPD7(s)
    jugerTypecheck(s, 'PD-8')
  }
  return s.fin()
}
process.exit(juger())
